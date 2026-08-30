using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Models;
using TimeTracker.Api.Services.AiTools;
using TimeTracker.Api.Services.Scheduling;

namespace TimeTracker.Api.Services;

/// <summary>
/// Composes the server-side "seed" instruction for the proactive daily check-in
/// (POST /api/ai/checkin) - the automatic opening turn KONER runs when the user reaches an
/// empty conversation, instead of waiting to be asked. Mirrors SolutionPage.tsx's
/// buildSummaryInstruction() pattern (a synthetic instruction run through the normal chat
/// pipeline) but server-side, since this needs DB access the frontend doesn't have.
///
/// Also where any due ScheduleProposal outcomes get lazily evaluated and persisted - the
/// same "opportunistic cleanup on the next relevant request" idiom ProposeScheduleTool and
/// SaveUserMemoryTool already use, rather than a background job (none exist in this app).
/// </summary>
public class CheckinSeedBuilder(AppDbContext db)
{
    /// <summary>Bounded per call so a long absence doesn't dump a huge backlog into one
    /// prompt - OutcomeEvaluatedAt guarantees forward progress across repeated check-ins.</summary>
    private const int MaxDueOutcomes = 2;

    private static readonly TimeSpan SignificantGap = TimeSpan.FromMinutes(25);
    private static readonly TimeOnly DefaultWakeTime = new(7, 0);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<string> BuildSeedAsync(Guid userId, CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();
        sb.AppendLine(
            "[Automatic daily check-in - the user has not typed anything yet. Follow the instructions " +
            "below to open the conversation; do not treat this bracketed text as something the user said.]");
        sb.AppendLine();

        var outcomeDigest = await BuildOutcomeDigestAsync(userId, cancellationToken);
        if (outcomeDigest is not null)
        {
            sb.AppendLine(outcomeDigest);
            sb.AppendLine();
        }

        var sleepRecord = await FindLastNightSleepAsync(userId, cancellationToken);
        if (sleepRecord is null)
        {
            sb.Append(
                "The user hasn't logged last night's sleep yet. Ask them, briefly and warmly, when " +
                "they went to sleep and woke up - keep it to 1-2 sentences and stop there. Save today's " +
                "overview for after they answer. When they do, use log_time_activity with action " +
                "'log' and category 'Sleep' to record it - if the stated bedtime is evening/night and " +
                "the wake time is numerically earlier, it spans midnight: startTime uses yesterday's " +
                "date, endTime uses today's date.");
        }
        else
        {
            var wakeTime = sleepRecord.EndTime ?? DateBoundaries.TodayStart.Add(DefaultWakeTime.ToTimeSpan());
            sb.Append(await BuildTodayDigestAsync(userId, wakeTime, cancellationToken));
        }

        return sb.ToString();
    }

    private async Task<TimeRecord?> FindLastNightSleepAsync(Guid userId, CancellationToken cancellationToken)
    {
        // "Last night" proxy: any Sleep-category record starting between yesterday noon
        // and today noon - the same "reasonable local-time proxy" convention DateBoundaries
        // already uses elsewhere (no per-user timezone is stored anywhere in this app).
        var todayNoon = DateBoundaries.TodayStart.AddHours(12);
        var yesterdayNoon = todayNoon.AddDays(-1);

        // Npgsql requires UTC-offset DateTimeOffset values for query parameters - same
        // conversion every existing AiTools query already does before filtering.
        var queryStart = yesterdayNoon.ToUniversalTime();
        var queryEnd = todayNoon.ToUniversalTime();

        return await db.TimeRecords
            .Where(r => r.UserId == userId && r.Category == "Sleep"
                && r.StartTime >= queryStart && r.StartTime < queryEnd)
            .OrderByDescending(r => r.StartTime)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<string> BuildTodayDigestAsync(Guid userId, DateTimeOffset windowStart, CancellationToken cancellationToken)
    {
        var todayStart = DateBoundaries.TodayStart;
        var queryStart = todayStart.ToUniversalTime();
        var queryEnd = todayStart.AddDays(1).ToUniversalTime();

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.StartTime >= queryStart && r.StartTime < queryEnd)
            .ToListAsync(cancellationToken);

        var completed = records.Where(r => r.EndTime != null).ToList();
        var totalHours = Math.Round(completed.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2);

        var byCategory = completed
            .GroupBy(r => r.Category)
            .Select(g => new { Category = g.Key, Hours = Math.Round(g.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2) })
            .OrderByDescending(c => c.Hours)
            .Take(4)
            .ToList();

        var gaps = GapFinder.FindGaps(
            records.Select(r => (r.StartTime, r.EndTime)).ToList(),
            windowStart, DateTimeOffset.Now, SignificantGap);

        var sb = new StringBuilder();
        sb.Append($"Today so far: {totalHours:0.#}h tracked.");
        if (byCategory.Count > 0)
            sb.Append($" Main categories: {string.Join(", ", byCategory.Select(c => $"{c.Category} ({c.Hours:0.#}h)"))}.");

        if (gaps.Count > 0)
        {
            var gapText = string.Join(", ", gaps.Select(g => $"{g.Start:HH:mm}-{g.End:HH:mm}"));
            sb.Append(
                $" Untracked periods: {gapText}. Greet the user concisely, state the total and main " +
                "categories, then briefly ask what they were doing during the gap(s) - summarize " +
                "naturally if there are several, don't list them mechanically.");
        }
        else
        {
            sb.Append(" Greet the user concisely and note they're fully tracked today so far.");
        }

        return sb.ToString();
    }

    private async Task<string?> BuildOutcomeDigestAsync(Guid userId, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTimeOffset.Now.Date);

        var due = await db.ScheduleProposals
            .Where(p => p.UserId == userId && p.Status == ScheduleProposalStatus.Approved
                && p.Date < today && p.OutcomeEvaluatedAt == null)
            .OrderBy(p => p.Date)
            .Take(MaxDueOutcomes)
            .ToListAsync(cancellationToken);

        if (due.Count == 0)
            return null;

        var now = DateTimeOffset.Now;
        var digests = new List<string>();

        foreach (var proposal in due)
        {
            var plannedRows = await db.Schedules
                .AsNoTracking()
                .Where(s => s.ProposalId == proposal.Id)
                .OrderBy(s => s.StartTime)
                .ToListAsync(cancellationToken);

            if (plannedRows.Count == 0)
            {
                // Nothing left to compare (e.g. the plan was later fully deleted via
                // AppliedSchedulesController) - mark evaluated so it isn't retried forever.
                proposal.OutcomeEvaluatedAt = now;
                continue;
            }

            var dayStart = DateBoundaries.LocalMidnight(proposal.Date);
            var queryStart = dayStart.ToUniversalTime();
            var queryEnd = dayStart.AddDays(1).ToUniversalTime();

            var actualRecords = await db.TimeRecords
                .AsNoTracking()
                .Where(r => r.UserId == userId && r.StartTime >= queryStart && r.StartTime < queryEnd)
                .ToListAsync(cancellationToken);

            var outcome = ScheduleOutcomeEvaluator.Evaluate(
                proposal.Id, proposal.Date, proposal.Title,
                plannedRows.Select(s => (s.StartTime, s.EndTime, s.Activity)).ToList(),
                actualRecords.Select(r => (r.StartTime, r.EndTime, r.Category)).ToList(),
                now);

            proposal.OutcomeEvaluatedAt = now;
            proposal.OutcomeSummaryJson = JsonSerializer.Serialize(outcome, JsonOptions);

            digests.Add(DescribeOutcome(outcome));
        }

        await db.SaveChangesAsync(cancellationToken);

        if (digests.Count == 0)
            return null;

        return "How the last few plans went, for you to weigh in on naturally and briefly (don't make " +
            "this the whole message) - and if you notice a durable behavior pattern (e.g. tends to " +
            "drift from one activity into another after a certain amount of time), call " +
            "save_user_memory with a concise statement of it so future schedule suggestions account " +
            "for it:\n" + string.Join("\n", digests);
    }

    private static string DescribeOutcome(ScheduleOutcomeEvaluator.PlanOutcome outcome)
    {
        var itemText = outcome.Items.Select(i =>
        {
            var pct = Math.Round(i.MatchedFraction * 100);
            return i.Adherence switch
            {
                ScheduleOutcomeEvaluator.ItemAdherence.Followed =>
                    $"{i.PlannedStart:HH:mm}-{i.PlannedEnd:HH:mm} {i.PlannedActivity}: followed ({pct}%)",
                ScheduleOutcomeEvaluator.ItemAdherence.PartiallyFollowed =>
                    $"{i.PlannedStart:HH:mm}-{i.PlannedEnd:HH:mm} {i.PlannedActivity}: partially followed " +
                    $"({pct}%), then drifted into {i.DivergedInto ?? "something else"}",
                ScheduleOutcomeEvaluator.ItemAdherence.Diverged =>
                    $"{i.PlannedStart:HH:mm}-{i.PlannedEnd:HH:mm} {i.PlannedActivity}: did " +
                    $"{i.DivergedInto ?? "something else"} instead",
                _ => $"{i.PlannedStart:HH:mm}-{i.PlannedEnd:HH:mm} {i.PlannedActivity}: skipped entirely",
            };
        });

        return $"- {outcome.Date:yyyy-MM-dd} '{outcome.Title}' (overall " +
            $"{Math.Round(outcome.OverallAdherence * 100)}% followed): {string.Join("; ", itemText)}";
    }
}

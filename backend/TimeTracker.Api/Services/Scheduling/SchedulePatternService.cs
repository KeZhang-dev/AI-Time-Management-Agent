using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.Scheduling;

/// <summary>
/// Deterministic "have I seen this before" summary over this user's already-evaluated
/// ScheduleProposal outcomes (ScheduleOutcomeEvaluator persists these lazily via
/// CheckinSeedBuilder). Groups past ItemOutcomes by planned activity and tallies how often
/// each was Followed/Partially followed/Not followed, so a pattern like "Study blocks over
/// 45 minutes keep getting broken" reaches the model as a plain fact on every turn - not
/// something it has to infer from scattered Memory entries it may or may not have saved.
/// </summary>
public class SchedulePatternService(AppDbContext db)
{
    /// <summary>How many of the user's most recently evaluated plans to consider.</summary>
    private const int LookbackPlans = 20;

    /// <summary>An activity needs at least this many past occurrences before its tally is
    /// worth surfacing - a single data point isn't a "pattern".</summary>
    private const int MinOccurrencesToSurface = 2;

    private const int MaxPatternsSurfaced = 3;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<string?> SummarizeRecentPatternsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var recentJson = await db.ScheduleProposals
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.OutcomeEvaluatedAt != null && p.OutcomeSummaryJson != null)
            .OrderByDescending(p => p.Date)
            .Take(LookbackPlans)
            .Select(p => p.OutcomeSummaryJson!)
            .ToListAsync(cancellationToken);

        if (recentJson.Count == 0)
            return null;

        var items = new List<ScheduleOutcomeEvaluator.ItemOutcome>();
        foreach (var json in recentJson)
        {
            // Stored by this same app (CheckinSeedBuilder) - malformed/legacy JSON should
            // never crash prompt building, so a bad row is skipped rather than failing the turn.
            try
            {
                var outcome = JsonSerializer.Deserialize<ScheduleOutcomeEvaluator.PlanOutcome>(json, JsonOptions);
                if (outcome is not null) items.AddRange(outcome.Items);
            }
            catch (JsonException)
            {
                // Skip this row.
            }
        }

        if (items.Count == 0)
            return null;

        var groups = items
            .GroupBy(i => i.PlannedActivity, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() >= MinOccurrencesToSurface)
            .Select(g => new
            {
                Activity = g.Key,
                Count = g.Count(),
                Followed = g.Count(i => i.Adherence == ScheduleOutcomeEvaluator.ItemAdherence.Followed),
                Partial = g.Count(i => i.Adherence == ScheduleOutcomeEvaluator.ItemAdherence.PartiallyFollowed),
                NotFollowed = g.Count(i => i.Adherence is ScheduleOutcomeEvaluator.ItemAdherence.Diverged
                    or ScheduleOutcomeEvaluator.ItemAdherence.Skipped),
                AvgMatchedFraction = g.Average(i => i.MatchedFraction),
                AvgPlannedMinutes = g.Average(i => PlannedMinutes(i.PlannedStart, i.PlannedEnd)),
            })
            .OrderBy(g => g.AvgMatchedFraction)
            .Take(MaxPatternsSurfaced)
            .ToList();

        if (groups.Count == 0)
            return null;

        var lines = groups.Select(g =>
            $"- {g.Activity} (avg planned {Math.Round(g.AvgPlannedMinutes)}min): {g.Followed} Followed, " +
            $"{g.Partial} Partially followed, {g.NotFollowed} Not followed ({g.Count} recent)");

        return "Recent schedule adherence patterns (from evaluated past schedules - use this to calibrate " +
            "realistic session lengths and content, not just repeat generic advice; don't recite these " +
            "numbers verbatim unless the user asks, just let them inform your reasoning):\n" +
            string.Join("\n", lines);
    }

    /// <summary>Same midnight convention as ScheduleValidation/ScheduleOutcomeEvaluator: an
    /// end time of exactly 00:00 means "runs to the end of the day".</summary>
    private static double PlannedMinutes(TimeOnly start, TimeOnly end)
    {
        var startMinutes = start.Hour * 60 + start.Minute;
        var endMinutes = end.Hour * 60 + end.Minute;
        if (endMinutes == 0) endMinutes = 24 * 60;
        return endMinutes - startMinutes;
    }
}

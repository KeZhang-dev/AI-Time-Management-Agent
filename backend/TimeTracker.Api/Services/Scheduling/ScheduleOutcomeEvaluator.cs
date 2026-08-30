using TimeTracker.Api.Services.AiTools;

namespace TimeTracker.Api.Services.Scheduling;

/// <summary>
/// Deterministic comparison of one applied plan's Schedule items against the actual
/// TimeRecords for that date - "Observe actual behaviour" / "Evaluate outcome" in the
/// Plan -> Execute -> Observe -> Evaluate -> Learn -> Improve loop. Sibling to
/// ScheduleValidation (which validates a plan before it exists); this evaluates one after
/// its date has already passed. Never delegated to the model - interval math needs to be
/// exact, not reasoned about token-by-token.
/// </summary>
public static class ScheduleOutcomeEvaluator
{
    public enum ItemAdherence { Followed, PartiallyFollowed, Diverged, Skipped }

    /// <summary>Matched-time fraction at/above which an item counts as fully followed.</summary>
    private const double FollowedThreshold = 0.8;

    private const int MinutesPerDay = 24 * 60;

    public record ItemOutcome(
        TimeOnly PlannedStart,
        TimeOnly PlannedEnd,
        string PlannedActivity,
        ItemAdherence Adherence,
        double MatchedFraction,
        string? DivergedInto,
        double DivergedFraction);

    public record PlanOutcome(
        Guid ProposalId,
        DateOnly Date,
        string Title,
        IReadOnlyList<ItemOutcome> Items,
        double OverallAdherence);

    /// <param name="actualRecords">All of the user's TimeRecords for <paramref name="date"/>,
    /// unfiltered by EndTime - an evaluator legitimately needs to see whatever actually
    /// happened, open or closed, not just completed records.</param>
    /// <param name="now">Current time, used to bound a record still open on <paramref
    /// name="date"/> itself (rare, but must not be read as extending past end-of-day).</param>
    public static PlanOutcome Evaluate(
        Guid proposalId,
        DateOnly date,
        string title,
        IReadOnlyList<(TimeOnly Start, TimeOnly End, string Activity)> plannedItems,
        IReadOnlyList<(DateTimeOffset Start, DateTimeOffset? End, string Category)> actualRecords,
        DateTimeOffset now)
    {
        var dayStart = DateBoundaries.LocalMidnight(date);
        var endOfDay = dayStart.AddDays(1);

        var items = new List<ItemOutcome>();
        var weightedMatchedMinutes = 0.0;
        var totalPlannedMinutes = 0.0;

        foreach (var planned in plannedItems)
        {
            var blockStart = dayStart.AddMinutes(StartMinutes(planned.Start));
            var blockEnd = dayStart.AddMinutes(EffectiveEndMinutes(planned.End));
            var plannedMinutes = (blockEnd - blockStart).TotalMinutes;

            var overlapByCategory = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            foreach (var record in actualRecords)
            {
                // A record still open on a PAST evaluated date is bounded to the end of
                // that day, never to "now" - a stale open record left running for days
                // after the plan's date must not be read as covering time on this date
                // that it never actually occupied.
                var effectiveEnd = record.End ?? Min(now, endOfDay);
                var overlapStart = Max(record.Start, blockStart);
                var overlapEnd = Min(effectiveEnd, blockEnd);
                if (overlapEnd <= overlapStart) continue;

                var minutes = (overlapEnd - overlapStart).TotalMinutes;
                overlapByCategory[record.Category] = overlapByCategory.GetValueOrDefault(record.Category) + minutes;
            }

            var matchedMinutes = overlapByCategory.GetValueOrDefault(planned.Activity);
            var coveredMinutes = overlapByCategory.Values.Sum();
            var matchedFraction = plannedMinutes > 0 ? Math.Clamp(matchedMinutes / plannedMinutes, 0, 1) : 0;

            var divergedEntry = overlapByCategory
                .Where(kv => !string.Equals(kv.Key, planned.Activity, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(kv => kv.Value)
                .FirstOrDefault();
            var divergedFraction = plannedMinutes > 0 ? Math.Clamp(divergedEntry.Value / plannedMinutes, 0, 1) : 0;

            var adherence =
                coveredMinutes <= 0 ? ItemAdherence.Skipped :
                matchedFraction >= FollowedThreshold ? ItemAdherence.Followed :
                matchedFraction > 0 ? ItemAdherence.PartiallyFollowed :
                ItemAdherence.Diverged;

            items.Add(new ItemOutcome(
                planned.Start, planned.End, planned.Activity, adherence,
                Math.Round(matchedFraction, 2), divergedEntry.Key, Math.Round(divergedFraction, 2)));

            weightedMatchedMinutes += matchedFraction * plannedMinutes;
            totalPlannedMinutes += plannedMinutes;
        }

        var overallAdherence = totalPlannedMinutes > 0 ? weightedMatchedMinutes / totalPlannedMinutes : 0;

        return new PlanOutcome(proposalId, date, title, items, Math.Round(overallAdherence, 2));
    }

    /// <summary>
    /// Collapses the 4-state ItemAdherence down to the simple 3-word vocabulary
    /// (Followed / Partially followed / Not followed) for anything user- or model-facing.
    /// Diverged (did something else instead) and Skipped (nothing tracked at all) are both
    /// "Not followed" under that vocabulary - the richer distinction stays available via
    /// DivergedInto/DivergedFraction for detail text, this just controls the label.
    /// </summary>
    public static string OutcomeLabel(ItemAdherence adherence) => adherence switch
    {
        ItemAdherence.Followed => "Followed",
        ItemAdherence.PartiallyFollowed => "Partially followed",
        _ => "Not followed",
    };

    /// <summary>Same 3-word vocabulary, applied to a whole plan's OverallAdherence fraction.</summary>
    public static string OverallOutcomeLabel(double overallAdherence) => overallAdherence switch
    {
        >= FollowedThreshold => "Followed",
        > 0 => "Partially followed",
        _ => "Not followed",
    };

    private static int StartMinutes(TimeOnly time) => time.Hour * 60 + time.Minute;

    /// <summary>Mirrors ScheduleValidation's convention: an end time of exactly midnight
    /// (00:00) means "runs to the end of the day", treated as 24:00 (1440) not 0.</summary>
    private static int EffectiveEndMinutes(TimeOnly end)
    {
        var minutes = end.Hour * 60 + end.Minute;
        return minutes == 0 ? MinutesPerDay : minutes;
    }

    private static DateTimeOffset Max(DateTimeOffset a, DateTimeOffset b) => a > b ? a : b;
    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;
}

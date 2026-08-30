namespace TimeTracker.Api.Services;

/// <summary>
/// Deterministic interval math for "what time isn't covered by any TimeRecord" - used by
/// the daily check-in to surface significant untracked periods. Never delegated to the
/// model: interval math needs to be exact, not reasoned about token-by-token.
/// </summary>
public static class GapFinder
{
    public record Gap(TimeOnly Start, TimeOnly End, TimeSpan Duration);

    /// <param name="records">The user's records overlapping the window, as (Start, End) - End
    /// null means still open/in-progress.</param>
    /// <param name="windowStart">Start of the period to check for gaps in (e.g. wake time).</param>
    /// <param name="windowEnd">End of the period to check for gaps in (e.g. now).</param>
    /// <param name="minGap">Ignore gaps shorter than this - short breaks between records aren't "significant".</param>
    /// <param name="maxGaps">Cap on how many gaps to surface (longest first), so a very
    /// fragmented day doesn't dump dozens of gaps into one prompt.</param>
    public static IReadOnlyList<Gap> FindGaps(
        IReadOnlyList<(DateTimeOffset Start, DateTimeOffset? End)> records,
        DateTimeOffset windowStart,
        DateTimeOffset windowEnd,
        TimeSpan minGap,
        int maxGaps = 5)
    {
        if (windowEnd <= windowStart) return [];

        // Clip every record to the window. An open record (End == null) is still in
        // progress, so it covers up to windowEnd - it's not a gap.
        var clipped = records
            .Select(r => (Start: Max(r.Start, windowStart), End: Min(r.End ?? windowEnd, windowEnd)))
            .Where(r => r.End > r.Start)
            .OrderBy(r => r.Start)
            .ToList();

        // Merge overlapping/adjacent intervals - the app doesn't prevent overlapping
        // TimeRecords today, so this can't assume the input is already disjoint.
        var merged = new List<(DateTimeOffset Start, DateTimeOffset End)>();
        foreach (var interval in clipped)
        {
            if (merged.Count > 0 && interval.Start <= merged[^1].End)
                merged[^1] = (merged[^1].Start, Max(merged[^1].End, interval.End));
            else
                merged.Add(interval);
        }

        // Walk the merged, covered intervals and collect whatever's left uncovered.
        var gaps = new List<Gap>();
        var cursor = windowStart;
        foreach (var interval in merged)
        {
            if (interval.Start > cursor) TryAddGap(gaps, cursor, interval.Start, minGap);
            cursor = Max(cursor, interval.End);
        }
        if (cursor < windowEnd) TryAddGap(gaps, cursor, windowEnd, minGap);

        return gaps.OrderByDescending(g => g.Duration).Take(maxGaps).OrderBy(g => g.Start).ToList();
    }

    private static void TryAddGap(List<Gap> gaps, DateTimeOffset start, DateTimeOffset end, TimeSpan minGap)
    {
        var duration = end - start;
        if (duration >= minGap)
            gaps.Add(new Gap(TimeOnly.FromDateTime(start.LocalDateTime), TimeOnly.FromDateTime(end.LocalDateTime), duration));
    }

    private static DateTimeOffset Max(DateTimeOffset a, DateTimeOffset b) => a > b ? a : b;
    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;
}

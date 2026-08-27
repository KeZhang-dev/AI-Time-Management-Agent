namespace TimeTracker.Api.Services.Scheduling;

/// <summary>
/// Structural/semantic validation shared by ProposeScheduleTool (when a proposal is
/// staged) and ScheduleProposalsController (re-checked when a proposal is approved).
/// Never trusts model-generated values - every proposal is validated on both ends.
/// </summary>
public static class ScheduleValidation
{
    public const int MaxItems = 12;
    public const int MaxTotalHours = 16;
    public const int MaxDaysAhead = 14;

    /// <summary>
    /// Tolerance for the "must not start in the past" check, to absorb the few
    /// seconds of real time that pass between reading the clock and this running
    /// (plus HH:mm having no seconds of its own), without weakening the check
    /// enough to miss a genuinely stale proposal like the reported 2+ hour gap.
    /// </summary>
    private const int PastStartGraceMinutes = 2;

    private const int MinutesPerDay = 24 * 60;

    /// <param name="currentTimeOfDay">
    /// Pass the actual current local time to enforce "a plan for today can't start
    /// in the past" - only meaningful at the moment a schedule is first staged
    /// (ProposeScheduleTool). Pass null (the default) when re-validating at
    /// approval time, since the user is expected to take some time to read a
    /// proposal before clicking Apply, and that delay must not retroactively
    /// invalidate an otherwise-valid schedule.
    /// </param>
    public static string? Validate(
        DateOnly date,
        IReadOnlyList<(TimeOnly Start, TimeOnly End, string Activity)> items,
        DateOnly today,
        TimeOnly? currentTimeOfDay = null)
    {
        if (items.Count == 0)
            return "The schedule must contain at least one item.";

        if (items.Count > MaxItems)
            return $"Too many schedule items (maximum {MaxItems}).";

        if (date < today)
            return "The schedule date cannot be in the past.";

        if (date > today.AddDays(MaxDaysAhead))
            return $"The schedule date is too far in the future (maximum {MaxDaysAhead} days ahead).";

        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Activity))
                return "Each schedule item must have a non-empty activity.";

            if (item.Activity.Length > 200)
                return "Activity text is too long (maximum 200 characters).";

            if (EffectiveEndMinutes(item.End) <= StartMinutes(item.Start))
                return $"Invalid time range for '{item.Activity}': end time must be after start time.";
        }

        var sorted = items.OrderBy(i => i.Start).ToList();
        for (var i = 1; i < sorted.Count; i++)
        {
            var previousEnd = EffectiveEndMinutes(sorted[i - 1].End);
            if (StartMinutes(sorted[i].Start) < previousEnd)
                return $"Schedule items overlap: '{sorted[i - 1].Activity}' and '{sorted[i].Activity}'.";
        }

        var totalMinutes = EffectiveEndMinutes(sorted[^1].End) - StartMinutes(sorted[0].Start);
        if (totalMinutes / 60.0 > MaxTotalHours)
            return $"The schedule spans too many hours (maximum {MaxTotalHours}h).";

        if (currentTimeOfDay is { } now && date == today)
        {
            var nowMinutes = Math.Max(0, StartMinutes(now) - PastStartGraceMinutes);
            var earliestStart = sorted[0].Start;
            if (StartMinutes(earliestStart) < nowMinutes)
            {
                return $"This plan is for today but starts at {earliestStart:HH:mm}, which is earlier " +
                       $"than the current time ({now:HH:mm}). A schedule for today must start at or " +
                       "after the current time - regenerate it using the current time as the starting point.";
            }
        }

        return null;
    }

    private static int StartMinutes(TimeOnly time) => time.Hour * 60 + time.Minute;

    /// <summary>
    /// A block's end time as minutes since the start of its day. An end time of
    /// exactly midnight (00:00) means "runs to the end of the day", so it's treated
    /// as 24:00 (1440) rather than 0 - this is what lets a schedule correctly cover
    /// a window like 22:00-00:00 without looking like a zero/negative-length block.
    /// </summary>
    private static int EffectiveEndMinutes(TimeOnly end)
    {
        var minutes = end.Hour * 60 + end.Minute;
        return minutes == 0 ? MinutesPerDay : minutes;
    }
}

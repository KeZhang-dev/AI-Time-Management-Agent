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

    public static string? Validate(
        DateOnly date,
        IReadOnlyList<(TimeOnly Start, TimeOnly End, string Activity)> items,
        DateOnly today)
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

            if (item.End <= item.Start)
                return $"Invalid time range for '{item.Activity}': end time must be after start time " +
                       "(schedules cannot cross midnight in v1).";
        }

        var sorted = items.OrderBy(i => i.Start).ToList();
        for (var i = 1; i < sorted.Count; i++)
        {
            if (sorted[i].Start < sorted[i - 1].End)
                return $"Schedule items overlap: '{sorted[i - 1].Activity}' and '{sorted[i].Activity}'.";
        }

        var totalHours = (sorted[^1].End.ToTimeSpan() - sorted[0].Start.ToTimeSpan()).TotalHours;
        if (totalHours > MaxTotalHours)
            return $"The schedule spans too many hours (maximum {MaxTotalHours}h).";

        return null;
    }
}

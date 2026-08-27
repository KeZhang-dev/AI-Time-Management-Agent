using TimeTracker.Api.Models;

namespace TimeTracker.Api.Services.AiTools;

/// <summary>Record shape handed to the model — deliberately excludes the database Id.</summary>
internal record AiRecordSummary(
    DateTimeOffset StartTime,
    DateTimeOffset? EndTime,
    string Category,
    string? Notes,
    double DurationHours);

internal static class AiRecordMapper
{
    public static AiRecordSummary ToSummary(TimeRecord r) => new(
        r.StartTime,
        r.EndTime,
        r.Category,
        r.Notes,
        Math.Round((r.EndTime!.Value - r.StartTime).TotalHours, 2));
}

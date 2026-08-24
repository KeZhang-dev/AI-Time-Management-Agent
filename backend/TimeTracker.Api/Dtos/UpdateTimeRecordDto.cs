using System.ComponentModel.DataAnnotations;

namespace TimeTracker.Api.Dtos;

public record UpdateTimeRecordDto(
    [Required] DateTimeOffset StartTime,
    DateTimeOffset? EndTime,
    [Required, MaxLength(100)] string Category,
    string? Notes
);

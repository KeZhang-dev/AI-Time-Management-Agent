using System.ComponentModel.DataAnnotations;

namespace TimeTracker.Api.Dtos;

public record CreateTimeRecordDto(
    [Required] DateTimeOffset StartTime,
    [Required] DateTimeOffset EndTime,
    [Required, MaxLength(100)] string Category,
    string? Notes
);

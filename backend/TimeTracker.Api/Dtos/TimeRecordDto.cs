namespace TimeTracker.Api.Dtos;

public record TimeRecordDto(
    Guid Id,
    DateTimeOffset StartTime,
    DateTimeOffset? EndTime,
    string Category,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);

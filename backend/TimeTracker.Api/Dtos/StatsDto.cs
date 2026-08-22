namespace TimeTracker.Api.Dtos;

public record CategoryStatDto(
    string Category,
    double TotalHours,
    int RecordCount
);

public record StatsResponseDto(
    DateTimeOffset? From,
    DateTimeOffset? To,
    double TotalHours,
    IReadOnlyList<CategoryStatDto> ByCategory
);

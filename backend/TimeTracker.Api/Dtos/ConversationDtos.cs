namespace TimeTracker.Api.Dtos;

public record ActivityCategoryShareDto(string Category, double Hours, int Count);

/// <summary>A compact snapshot of activity data the agent already looked at, for display only.</summary>
public record ActivityOverviewDto(
    string Label,
    double TotalHours,
    int RecordCount,
    IReadOnlyList<ActivityCategoryShareDto> ByCategory
);

public record ConversationMessageDto(
    Guid Id,
    string Role,
    string Content,
    DateTimeOffset CreatedAt,
    ActivityOverviewDto? Overview,
    ScheduleProposalDto? Proposal,
    string? ProposalStatus
);

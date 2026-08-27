namespace TimeTracker.Api.Dtos;

public record ScheduleItemDto(
    string StartTime,
    string EndTime,
    string Activity,
    string? Reason
);

/// <summary>A staged, unapplied schedule recommendation the user must explicitly approve.</summary>
public record ScheduleProposalDto(
    Guid ProposalId,
    string Title,
    string Date,
    IReadOnlyList<ScheduleItemDto> Items
);

public record ScheduleProposalActionResponseDto(
    Guid ProposalId,
    string Status,
    IReadOnlyList<ScheduleItemDto>? Schedule
);

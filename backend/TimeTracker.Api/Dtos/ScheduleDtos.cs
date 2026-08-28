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

/// <summary>
/// One applied schedule as shown in the sidebar list. "ScheduleId" groups the
/// set of Schedule rows that make up one applied plan (they all share the same
/// ProposalId - the stable grouping key since a plan is always created as a batch).
/// </summary>
public record AppliedScheduleSummaryDto(
    Guid ScheduleId,
    int Number,
    string Title,
    string Date,
    DateTimeOffset CreatedAt,
    double TotalHours,
    int ItemCount
);

public record AppliedScheduleItemDto(
    Guid Id,
    string StartTime,
    string EndTime,
    string Activity,
    string? Description
);

public record AppliedScheduleDetailDto(
    Guid ScheduleId,
    string Title,
    string Date,
    DateTimeOffset CreatedAt,
    double TotalHours,
    IReadOnlyList<AppliedScheduleItemDto> Items
);

public record UpdateAppliedScheduleItemDto(
    Guid Id,
    string StartTime,
    string EndTime,
    string Activity,
    string? Description
);

public record UpdateAppliedScheduleDto(
    string Title,
    string Date,
    IReadOnlyList<UpdateAppliedScheduleItemDto> Items
);

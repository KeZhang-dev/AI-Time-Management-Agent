using System.ComponentModel.DataAnnotations;

namespace TimeTracker.Api.Dtos;

public record AiTestRequestDto(
    [Required] string Prompt
);

public record AiTestResponseDto(
    string Response
);

public record AiAnalyzeRequestDto(
    [Required] string Message
);

public record AiAnalyzeResponseDto(
    string Response,
    ScheduleProposalDto? Proposal = null,
    ActivityOverviewDto? Overview = null,
    string ProviderId = ""
);

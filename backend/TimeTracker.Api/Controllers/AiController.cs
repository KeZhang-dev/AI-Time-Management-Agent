using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Services;

namespace TimeTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/ai")]
public class AiController(IGeminiService geminiService, AiAgentService aiAgentService) : ControllerBase
{
    [HttpPost("test")]
    public async Task<ActionResult<AiTestResponseDto>> Test(AiTestRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var responseText = await geminiService.GenerateTextAsync(dto.Prompt, cancellationToken);
            return Ok(new AiTestResponseDto(responseText));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    [HttpPost("analyze")]
    public async Task<ActionResult<AiAnalyzeResponseDto>> Analyze(AiAnalyzeRequestDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        try
        {
            var result = await aiAgentService.HandleUserMessageAsync(userId, dto.Message, cancellationToken);
            return Ok(new AiAnalyzeResponseDto(result.ResponseText, result.Proposal));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

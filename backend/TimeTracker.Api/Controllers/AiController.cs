using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;
using TimeTracker.Api.Services;

namespace TimeTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/ai")]
public class AiController(
    IGeminiService geminiService,
    AiAgentService aiAgentService,
    AppDbContext db,
    ILogger<AiController> logger) : ControllerBase
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
        var receivedAt = DateTimeOffset.UtcNow;

        try
        {
            var result = await aiAgentService.HandleUserMessageAsync(userId, dto.Message, cancellationToken);

            // Persisted purely for the chat UI to reload conversation history - this
            // never feeds back into the Gemini tool-calling loop, which stays
            // single-turn exactly as before. A persistence failure must not swallow
            // an answer the user already has, so it's logged and ignored rather than
            // failing the request.
            try
            {
                await SaveTurnAsync(userId, dto.Message, receivedAt, result, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to persist conversation turn for user {UserId}", userId);
            }

            return Ok(new AiAnalyzeResponseDto(result.ResponseText, result.Proposal, result.Overview));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    private async Task SaveTurnAsync(
        Guid userId, string userMessage, DateTimeOffset userMessageAt, AiAgentResult result, CancellationToken cancellationToken)
    {
        // The assistant row is always timestamped after the user row (real time elapses
        // during the Gemini call in between), so ordering by CreatedAt alone is enough
        // to reconstruct turn order - no tie-breaking needed even if a request were
        // somehow instantaneous, since UtcNow is re-read here rather than reused.
        var respondedAt = DateTimeOffset.UtcNow;
        if (respondedAt <= userMessageAt)
            respondedAt = userMessageAt.AddTicks(1);

        db.ConversationMessages.AddRange(
            new ConversationMessage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Role = ConversationRole.User,
                Content = userMessage,
                CreatedAt = userMessageAt,
            },
            new ConversationMessage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Role = ConversationRole.Assistant,
                Content = result.ResponseText,
                OverviewJson = result.Overview is null ? null : JsonSerializer.Serialize(result.Overview),
                ProposalId = result.Proposal?.ProposalId,
                CreatedAt = respondedAt,
            });

        await db.SaveChangesAsync(cancellationToken);
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

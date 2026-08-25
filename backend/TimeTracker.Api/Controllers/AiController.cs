using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Services;

namespace TimeTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/ai")]
public class AiController(AppDbContext db, IGeminiService geminiService) : ControllerBase
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

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime != null)
            .ToListAsync(cancellationToken);

        var byCategory = records
            .GroupBy(r => r.Category)
            .Select(g => new
            {
                Category = g.Key,
                Hours = Math.Round(g.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2),
                Count = g.Count(),
            })
            .OrderByDescending(c => c.Hours)
            .ToList();

        var dataSummary = byCategory.Count == 0
            ? "The user has no completed time records yet."
            : $"""
              Total tracked time: {byCategory.Sum(c => c.Hours):0.##}h across {records.Count} record(s).
              Breakdown by category:
              {string.Join('\n', byCategory.Select(c => $"- {c.Category}: {c.Hours}h across {c.Count} record(s)"))}
              """;

        var prompt = $"""
            You are KONER, an AI assistant inside a personal time-tracking app. Answer the user's
            question using only the summary of their tracked time below. Be concise, specific, and
            encouraging. If the data is insufficient to answer, say so honestly rather than guessing.

            Time tracking summary:
            {dataSummary}

            User's question: {dto.Message}
            """;

        try
        {
            var responseText = await geminiService.GenerateTextAsync(prompt, cancellationToken);
            return Ok(new AiAnalyzeResponseDto(responseText));
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

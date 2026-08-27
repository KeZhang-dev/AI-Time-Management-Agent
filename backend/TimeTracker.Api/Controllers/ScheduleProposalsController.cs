using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;
using TimeTracker.Api.Services.Scheduling;

namespace TimeTracker.Api.Controllers;

/// <summary>
/// Owns the approval boundary for agent-proposed schedules. Gemini can only ever
/// reach ProposeScheduleTool, which stages a Pending row here; only an authenticated
/// call to Approve actually writes to the Schedule table. UserId always comes from
/// the JWT, never from the request body or the proposal content.
/// </summary>
[Authorize]
[ApiController]
[Route("api/schedule-proposals")]
public class ScheduleProposalsController(AppDbContext db) : ControllerBase
{
    private static readonly JsonSerializerOptions ItemsJsonOptions = new() { PropertyNameCaseInsensitive = true };

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<ScheduleProposalActionResponseDto>> Approve(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var now = DateTimeOffset.UtcNow;

        // Atomic conditional update: only a request that finds the proposal still
        // Pending (and unexpired, and owned by this user) can flip it to Approved.
        // A concurrent duplicate click loses this race and affects 0 rows.
        var rowsAffected = await db.ScheduleProposals
            .Where(p => p.Id == id
                && p.UserId == userId
                && p.Status == ScheduleProposalStatus.Pending
                && p.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, ScheduleProposalStatus.Approved)
                .SetProperty(p => p.ResolvedAt, now), cancellationToken);

        if (rowsAffected == 0)
            return await ConflictOrNotFound(id, userId, cancellationToken);

        var proposal = await db.ScheduleProposals.AsNoTracking().FirstAsync(p => p.Id == id, cancellationToken);

        // Re-parsing our own stored proposal should never fail in practice (it was
        // already validated when staged), but never let malformed/corrupt data
        // surface as a raw 500 - treat it the same as a failed re-validation.
        string? validationError;
        List<ScheduleItemDto> items;
        try
        {
            items = JsonSerializer.Deserialize<List<ScheduleItemDto>>(proposal.ItemsJson, ItemsJsonOptions) ?? [];
            var parsed = items
                .Select(i => (Start: TimeOnly.Parse(i.StartTime), End: TimeOnly.Parse(i.EndTime), i.Activity))
                .ToList();

            var today = DateOnly.FromDateTime(DateTimeOffset.Now.Date);
            validationError = ScheduleValidation.Validate(proposal.Date, parsed, today);
        }
        catch (Exception ex) when (ex is JsonException or FormatException)
        {
            items = [];
            validationError = "The stored proposal data could not be read.";
        }

        if (validationError is not null)
        {
            // Should not normally happen (already validated when staged) - fail safe
            // instead of silently creating a bad schedule.
            await db.ScheduleProposals
                .Where(p => p.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, ScheduleProposalStatus.Failed), cancellationToken);

            return Problem(
                detail: $"The proposal could not be applied: {validationError}",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var scheduleRows = items.Select(i => new Schedule
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Date = proposal.Date,
            StartTime = TimeOnly.Parse(i.StartTime),
            EndTime = TimeOnly.Parse(i.EndTime),
            Activity = i.Activity,
            ProposalId = proposal.Id,
            CreatedAt = now,
        }).ToList();

        db.Schedules.AddRange(scheduleRows);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new ScheduleProposalActionResponseDto(proposal.Id, ScheduleProposalStatus.Approved, items));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<ScheduleProposalActionResponseDto>> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var now = DateTimeOffset.UtcNow;

        var rowsAffected = await db.ScheduleProposals
            .Where(p => p.Id == id && p.UserId == userId && p.Status == ScheduleProposalStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, ScheduleProposalStatus.Cancelled)
                .SetProperty(p => p.ResolvedAt, now), cancellationToken);

        if (rowsAffected == 0)
            return await ConflictOrNotFound(id, userId, cancellationToken);

        return Ok(new ScheduleProposalActionResponseDto(id, ScheduleProposalStatus.Cancelled, null));
    }

    private async Task<ActionResult<ScheduleProposalActionResponseDto>> ConflictOrNotFound(
        Guid id, Guid userId, CancellationToken cancellationToken)
    {
        // Scoping this lookup by userId too means a proposal belonging to another
        // user is indistinguishable from one that doesn't exist - no existence leak.
        var existing = await db.ScheduleProposals.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, cancellationToken);

        if (existing is null)
            return NotFound();

        return Conflict(new { message = $"This proposal is no longer pending (status: {existing.Status})." });
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

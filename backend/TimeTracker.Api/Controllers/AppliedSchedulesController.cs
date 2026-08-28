using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;
using TimeTracker.Api.Services.Scheduling;

namespace TimeTracker.Api.Controllers;

/// <summary>
/// CRUD over already-applied Schedule rows (the sidebar's applied-schedule
/// history). This never touches ScheduleProposal, TimeRecord, Memory, or
/// ConversationMessage - editing/deleting here is independent of the AI
/// proposal/approval flow, which only ScheduleProposalsController owns.
/// A "schedule" here is a group of Schedule rows sharing the same ProposalId
/// (the batch created together when one proposal was approved) - ProposalId
/// doubles as the stable id used to address the group from the frontend.
/// </summary>
[Authorize]
[ApiController]
[Route("api/schedules")]
public class AppliedSchedulesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AppliedScheduleSummaryDto>>> List(CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var rows = await db.Schedules.AsNoTracking()
            .Where(s => s.UserId == userId)
            .ToListAsync(cancellationToken);

        var groups = rows
            .GroupBy(GroupKey)
            .Select(g => new
            {
                ScheduleId = g.Key,
                Title = g.First().Title,
                Date = g.First().Date,
                CreatedAt = g.Min(s => s.CreatedAt),
                TotalHours = TotalHours(g),
                ItemCount = g.Count(),
            })
            .OrderBy(g => g.CreatedAt)
            .ToList();

        var result = groups
            .Select((g, index) => new AppliedScheduleSummaryDto(
                g.ScheduleId,
                index + 1,
                g.Title,
                g.Date.ToString("yyyy-MM-dd"),
                g.CreatedAt,
                g.TotalHours,
                g.ItemCount))
            .OrderByDescending(dto => dto.CreatedAt)
            .ToList();

        return Ok(result);
    }

    [HttpGet("{scheduleId:guid}")]
    public async Task<ActionResult<AppliedScheduleDetailDto>> Detail(Guid scheduleId, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var rows = await LoadGroup(scheduleId, userId, cancellationToken);

        if (rows.Count == 0)
            return NotFound();

        var ordered = rows.OrderBy(s => s.StartTime).ToList();
        var detail = new AppliedScheduleDetailDto(
            scheduleId,
            ordered[0].Title,
            ordered[0].Date.ToString("yyyy-MM-dd"),
            rows.Min(s => s.CreatedAt),
            TotalHours(ordered),
            ordered.Select(s => new AppliedScheduleItemDto(
                s.Id, s.StartTime.ToString("HH:mm"), s.EndTime.ToString("HH:mm"), s.Activity, s.Description)).ToList());

        return Ok(detail);
    }

    [HttpPut("{scheduleId:guid}")]
    public async Task<ActionResult<AppliedScheduleDetailDto>> Update(
        Guid scheduleId, UpdateAppliedScheduleDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        var rows = await LoadGroup(scheduleId, userId, cancellationToken);

        if (rows.Count == 0)
            return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return Problem(detail: "Title is required.", statusCode: StatusCodes.Status422UnprocessableEntity);

        if (dto.Title.Length > 200)
            return Problem(detail: "Title is too long (maximum 200 characters).", statusCode: StatusCodes.Status422UnprocessableEntity);

        if (!DateOnly.TryParse(dto.Date, out var date))
            return Problem(detail: "Invalid date.", statusCode: StatusCodes.Status422UnprocessableEntity);

        var existingIds = rows.Select(s => s.Id).ToHashSet();
        var updateIds = dto.Items.Select(i => i.Id).ToHashSet();
        if (!existingIds.SetEquals(updateIds))
            return Problem(
                detail: "Schedule items cannot be added or removed here - only their fields can be edited.",
                statusCode: StatusCodes.Status422UnprocessableEntity);

        List<(TimeOnly Start, TimeOnly End, string Activity)> parsed;
        try
        {
            parsed = dto.Items
                .Select(i => (Start: TimeOnly.Parse(i.StartTime), End: TimeOnly.Parse(i.EndTime), i.Activity))
                .ToList();
        }
        catch (FormatException)
        {
            return Problem(detail: "Invalid time value.", statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var today = DateOnly.FromDateTime(DateTimeOffset.Now.Date);
        var validationError = ScheduleValidation.Validate(date, parsed, today);
        if (validationError is not null)
            return Problem(detail: validationError, statusCode: StatusCodes.Status422UnprocessableEntity);

        var byId = rows.ToDictionary(s => s.Id);
        foreach (var item in dto.Items)
        {
            var schedule = byId[item.Id];
            schedule.StartTime = TimeOnly.Parse(item.StartTime);
            schedule.EndTime = TimeOnly.Parse(item.EndTime);
            schedule.Activity = item.Activity;
            schedule.Description = item.Description;
            schedule.Title = dto.Title;
            schedule.Date = date;
        }

        await db.SaveChangesAsync(cancellationToken);

        return await Detail(scheduleId, cancellationToken);
    }

    [HttpDelete("{scheduleId:guid}")]
    public async Task<IActionResult> Delete(Guid scheduleId, CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var rowsAffected = await db.Schedules
            .Where(s => s.UserId == userId && (s.ProposalId == scheduleId || (s.ProposalId == null && s.Id == scheduleId)))
            .ExecuteDeleteAsync(cancellationToken);

        if (rowsAffected == 0)
            return NotFound();

        return NoContent();
    }

    private async Task<List<Schedule>> LoadGroup(Guid scheduleId, Guid userId, CancellationToken cancellationToken) =>
        await db.Schedules
            .Where(s => s.UserId == userId && (s.ProposalId == scheduleId || (s.ProposalId == null && s.Id == scheduleId)))
            .ToListAsync(cancellationToken);

    private static Guid GroupKey(Schedule s) => s.ProposalId ?? s.Id;

    private static double TotalHours(IEnumerable<Schedule> items)
    {
        var total = 0.0;
        foreach (var s in items)
        {
            var startMinutes = s.StartTime.Hour * 60 + s.StartTime.Minute;
            var endMinutes = s.EndTime.Hour * 60 + s.EndTime.Minute;
            if (endMinutes == 0) endMinutes = 24 * 60;
            total += (endMinutes - startMinutes) / 60.0;
        }
        return total;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

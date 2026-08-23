using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;

namespace TimeTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/time-records")]
public class TimeRecordsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TimeRecordDto>>> GetAll(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to,
        [FromQuery] string? category)
    {
        var userId = GetUserId();
        var query = db.TimeRecords.AsNoTracking().Where(r => r.UserId == userId);

        if (from is not null) query = query.Where(r => r.EndTime >= from);
        if (to is not null) query = query.Where(r => r.StartTime <= to);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(r => r.Category == category);

        var records = await query
            .OrderByDescending(r => r.StartTime)
            .Select(r => ToDto(r))
            .ToListAsync();

        return Ok(records);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TimeRecordDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        var record = await db.TimeRecords.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (record is null) return NotFound();
        return Ok(ToDto(record));
    }

    [HttpGet("stats")]
    public async Task<ActionResult<StatsResponseDto>> GetStats(
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? to)
    {
        var userId = GetUserId();
        var query = db.TimeRecords.AsNoTracking().Where(r => r.UserId == userId);

        if (from is not null) query = query.Where(r => r.EndTime >= from);
        if (to is not null) query = query.Where(r => r.StartTime <= to);

        var records = await query.ToListAsync();

        var byCategory = records
            .GroupBy(r => r.Category)
            .Select(g => new CategoryStatDto(
                g.Key,
                Math.Round(g.Sum(r => (r.EndTime - r.StartTime).TotalHours), 2),
                g.Count()))
            .OrderByDescending(c => c.TotalHours)
            .ToList();

        var totalHours = Math.Round(records.Sum(r => (r.EndTime - r.StartTime).TotalHours), 2);

        return Ok(new StatsResponseDto(from, to, totalHours, byCategory));
    }

    [HttpPost]
    public async Task<ActionResult<TimeRecordDto>> Create(CreateTimeRecordDto dto)
    {
        if (dto.EndTime <= dto.StartTime)
            return ValidationProblem("EndTime must be after StartTime.");

        var record = new TimeRecord
        {
            Id = Guid.NewGuid(),
            UserId = GetUserId(),
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Category = dto.Category,
            Notes = dto.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.TimeRecords.Add(record);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = record.Id }, ToDto(record));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TimeRecordDto>> Update(Guid id, UpdateTimeRecordDto dto)
    {
        if (dto.EndTime <= dto.StartTime)
            return ValidationProblem("EndTime must be after StartTime.");

        var userId = GetUserId();
        var record = await db.TimeRecords.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (record is null) return NotFound();

        record.StartTime = dto.StartTime;
        record.EndTime = dto.EndTime;
        record.Category = dto.Category;
        record.Notes = dto.Notes;
        record.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();

        return Ok(ToDto(record));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var record = await db.TimeRecords.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);
        if (record is null) return NotFound();

        db.TimeRecords.Remove(record);
        await db.SaveChangesAsync();

        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static TimeRecordDto ToDto(TimeRecord r) => new(
        r.Id, r.StartTime, r.EndTime, r.Category, r.Notes, r.CreatedAt, r.UpdatedAt);
}

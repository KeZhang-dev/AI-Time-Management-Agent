using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Models;

namespace TimeTracker.Api.Services.AiTools;

/// <summary>
/// Starts, stops, or retroactively logs the user's current/recent tracked activity from
/// natural language ("I'm going to study now", "I'm heading out", "I went to bed at 11:15
/// and woke up at 8:50"). This writes plain TimeRecord rows - the same rows the manual
/// Record page writes - so it is deliberately separate from long-term Memory
/// (get_user_memory/save_user_memory): never call save_user_memory for this.
/// </summary>
public class LogTimeActivityTool(AppDbContext db) : IAgentTool
{
    /// <summary>
    /// Cap on how far start/stop will silently carry a session forward. Prevents a
    /// forgotten open record (crashed browser, closed laptop, a "stop" that never came)
    /// from being silently stretched into a multi-day TimeRecord the next time the user
    /// starts something new - tighter than ScheduleValidation.MaxTotalHours (a whole day's
    /// plan) since no single continuous activity should plausibly run that long.
    /// </summary>
    private static readonly TimeSpan MaxSessionLength = TimeSpan.FromHours(12);

    private const string DateTimeFormat = "yyyy-MM-dd HH:mm";

    public string Name => "log_time_activity";

    public string Description =>
        "Starts, stops, or retroactively logs the user's current/recent tracked activity based on " +
        "what they say (e.g. 'I'm going to study now', 'I'm heading out', 'I went to bed at 11:15 and " +
        "woke up at 8:50'). This is operational tracking state - a TimeRecord row - separate from " +
        "long-term memory. Never use save_user_memory for this.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["action"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["enum"] = new[] { "start", "stop", "log" },
                ["description"] =
                    "'start': begin an open-ended activity now (or at startTime), implicitly ending " +
                    "whatever was previously running. 'stop': close whatever activity is currently " +
                    "running, now (or at endTime). 'log': record a fully-known past activity with both " +
                    "startTime and endTime, e.g. answering a sleep check-in question.",
            },
            ["category"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "Activity category, e.g. Study, Work, Sleep, Exercise. Required for " +
                    "'start' and 'log'. Ignored for 'stop'.",
            },
            ["startTime"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "For 'start': local time-of-day today, format HH:mm - omit to use the " +
                    "current time. For 'log': full local date and time, format yyyy-MM-dd HH:mm " +
                    "(required - for an overnight span like sleep, use yesterday's date for startTime " +
                    "and today's date for endTime). Ignored for 'stop'.",
            },
            ["endTime"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "For 'stop': local time-of-day today, format HH:mm - omit to use the " +
                    "current time. For 'log': full local date and time, format yyyy-MM-dd HH:mm " +
                    "(required). Ignored for 'start'.",
            },
            ["notes"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "Optional short note about this activity.",
            },
        },
        ["required"] = new[] { "action" },
    };

    public Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var action = AgentToolArgs.ReadString(args, "action");
        return action switch
        {
            "start" => StartAsync(userId, args, cancellationToken),
            "stop" => StopAsync(userId, args, cancellationToken),
            "log" => LogAsync(userId, args, cancellationToken),
            _ => Task.FromResult<object>(new { error = "'action' must be one of: start, stop, log." }),
        };
    }

    private async Task<object> StartAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var category = AgentToolArgs.ReadString(args, "category")?.Trim();
        if (string.IsNullOrWhiteSpace(category))
            return new { error = "'category' is required for 'start'." };

        if (!TryResolveTimeOfDay(AgentToolArgs.ReadString(args, "startTime"), out var start, out var timeError))
            return new { error = timeError };

        var notes = AgentToolArgs.ReadString(args, "notes")?.Trim();
        notes = string.IsNullOrWhiteSpace(notes) ? null : notes;

        var open = await db.TimeRecords
            .Where(r => r.UserId == userId && r.EndTime == null)
            .OrderByDescending(r => r.StartTime)
            .FirstOrDefaultAsync(cancellationToken);

        object? autoClosedPrevious = null;
        if (open is not null)
        {
            var cappedEnd = Min(start, open.StartTime + MaxSessionLength);
            if (cappedEnd <= open.StartTime) cappedEnd = open.StartTime.AddMinutes(1);

            open.EndTime = cappedEnd;
            open.UpdatedAt = DateTimeOffset.UtcNow;

            autoClosedPrevious = new
            {
                category = open.Category,
                startTime = open.StartTime,
                endTime = open.EndTime,
                wasCapped = cappedEnd < start,
            };
        }

        db.TimeRecords.Add(new TimeRecord
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StartTime = start,
            EndTime = null,
            Category = category,
            Notes = notes,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync(cancellationToken);

        return new { status = "started", category, startTime = start, autoClosedPrevious };
    }

    private async Task<object> StopAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var open = await db.TimeRecords
            .Where(r => r.UserId == userId && r.EndTime == null)
            .OrderByDescending(r => r.StartTime)
            .FirstOrDefaultAsync(cancellationToken);

        if (open is null)
            return new { status = "no_active_record" };

        if (!TryResolveTimeOfDay(AgentToolArgs.ReadString(args, "endTime"), out var end, out var timeError))
            return new { error = timeError };

        var cappedEnd = Min(end, open.StartTime + MaxSessionLength);
        if (cappedEnd <= open.StartTime) cappedEnd = open.StartTime.AddMinutes(1);

        open.EndTime = cappedEnd;
        open.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return new
        {
            status = "stopped",
            category = open.Category,
            startTime = open.StartTime,
            endTime = open.EndTime,
            durationHours = Math.Round((open.EndTime!.Value - open.StartTime).TotalHours, 2),
            wasCapped = cappedEnd < end,
        };
    }

    private async Task<object> LogAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var category = AgentToolArgs.ReadString(args, "category")?.Trim();
        if (string.IsNullOrWhiteSpace(category))
            return new { error = "'category' is required for 'log'." };

        if (!TryParseLocalDateTime(AgentToolArgs.ReadString(args, "startTime"), out var start))
            return new { error = "'startTime' is required for 'log' and must be format yyyy-MM-dd HH:mm." };

        if (!TryParseLocalDateTime(AgentToolArgs.ReadString(args, "endTime"), out var end))
            return new { error = "'endTime' is required for 'log' and must be format yyyy-MM-dd HH:mm." };

        if (end <= start)
            return new { error = "'endTime' must be after 'startTime'." };

        // Don't silently clobber a currently-running record - surface the conflict so the
        // model can ask the user, rather than corrupting either row.
        var open = await db.TimeRecords
            .Where(r => r.UserId == userId && r.EndTime == null)
            .OrderByDescending(r => r.StartTime)
            .FirstOrDefaultAsync(cancellationToken);

        if (open is not null && end > open.StartTime)
        {
            return new
            {
                error = $"This overlaps the currently-running '{open.Category}' activity (started " +
                    $"{open.StartTime:yyyy-MM-dd HH:mm}). Ask the user whether that should be stopped " +
                    "first, or adjust the times so they don't overlap.",
            };
        }

        var notes = AgentToolArgs.ReadString(args, "notes")?.Trim();
        notes = string.IsNullOrWhiteSpace(notes) ? null : notes;

        db.TimeRecords.Add(new TimeRecord
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StartTime = start,
            EndTime = end,
            Category = category,
            Notes = notes,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync(cancellationToken);

        return new
        {
            status = "logged",
            category,
            startTime = start,
            endTime = end,
            durationHours = Math.Round((end - start).TotalHours, 2),
        };
    }

    /// <summary>Resolves an optional "HH:mm" local time-of-day (today) to a DateTimeOffset, defaulting to now.</summary>
    private static bool TryResolveTimeOfDay(string? text, out DateTimeOffset result, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(text))
        {
            result = DateTimeOffset.UtcNow;
            return true;
        }

        if (!TimeOnly.TryParse(text, out var timeOfDay))
        {
            result = default;
            error = $"'{text}' is not a valid time - use 24-hour format HH:mm.";
            return false;
        }

        var today = DateOnly.FromDateTime(DateTimeOffset.Now.Date);
        var local = today.ToDateTime(timeOfDay);
        var offset = TimeZoneInfo.Local.GetUtcOffset(local);
        // Npgsql only accepts UTC-offset (Offset == 0) DateTimeOffset values for
        // 'timestamp with time zone' columns - this is what TimeRecord.StartTime/EndTime
        // are mapped to. ToUniversalTime() keeps the same instant, just re-expressed with
        // Offset=0, which is what the write path (and every existing AiTools query)
        // requires. Without this, any non-UTC server timezone throws ArgumentException on
        // save: "Cannot write DateTimeOffset with Offset=... only offset 0 (UTC) is
        // supported."
        result = new DateTimeOffset(local, offset).ToUniversalTime();
        return true;
    }

    private static bool TryParseLocalDateTime(string? text, out DateTimeOffset result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(text)) return false;

        if (!DateTime.TryParseExact(
                text, DateTimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var local))
        {
            return false;
        }

        var offset = TimeZoneInfo.Local.GetUtcOffset(local);
        // Same Npgsql UTC-offset requirement as TryResolveTimeOfDay above.
        result = new DateTimeOffset(local, offset).ToUniversalTime();
        return true;
    }

    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset b) => a < b ? a : b;
}

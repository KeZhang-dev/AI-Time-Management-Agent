using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services;

/// <summary>
/// Deterministic "is something currently being tracked" fact for the system prompt -
/// closes the blind spot where every read-only AiTools query filters out EndTime IS NULL
/// rows, so the model otherwise has no way to know an open TimeRecord exists (e.g. a
/// Sleep session started hours ago, before the browser/laptop went offline). Sibling to
/// SchedulePatternService: a small per-request DB fact appended to the system prompt,
/// not a tool - the model never calls this directly, and log_time_activity's own
/// EndTime IS NULL lookup (which already works correctly) is untouched.
/// </summary>
public class ActiveSessionService(AppDbContext db)
{
    public async Task<string?> DescribeActiveSessionAsync(Guid userId, CancellationToken cancellationToken)
    {
        var open = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime == null)
            .OrderByDescending(r => r.StartTime)
            .FirstOrDefaultAsync(cancellationToken);

        if (open is null)
            return null;

        var elapsed = DateTimeOffset.UtcNow - open.StartTime;

        return $"The user currently has an open, in-progress '{open.Category}' session that started at " +
            $"{open.StartTime.ToLocalTime():HH:mm} and has been running for about {FormatElapsed(elapsed)} " +
            "so far - this is true no matter how long ago that was or whether they've been offline since " +
            "(e.g. their laptop was closed). If the user now says anything indicating they've finished, " +
            "stopped, woken up, or are otherwise done with that activity, call log_time_activity with " +
            "action 'stop' (using their stated end time if they give one, otherwise now) to close it. You " +
            "already know when it started, so don't ask; and you don't need any other tool to confirm " +
            "this session exists.";
    }

    private static string FormatElapsed(TimeSpan elapsed)
    {
        var totalMinutes = Math.Max(0, (int)elapsed.TotalMinutes);
        var hours = totalMinutes / 60;
        var minutes = totalMinutes % 60;
        if (hours == 0) return $"{minutes}m";
        if (minutes == 0) return $"{hours}h";
        return $"{hours}h {minutes}m";
    }
}

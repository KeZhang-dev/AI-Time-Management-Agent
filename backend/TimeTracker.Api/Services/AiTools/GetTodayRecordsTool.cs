using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.AiTools;

public class GetTodayRecordsTool(AppDbContext db) : IAgentTool
{
    public string Name => "get_today_records";

    public string Description =>
        "Returns the authenticated user's completed time records for today (local calendar day), " +
        "including total hours and record count.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>(),
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var todayStart = DateBoundaries.TodayStart;
        var todayEnd = todayStart.AddDays(1);

        // Postgres 'timestamp with time zone' columns only accept UTC-offset
        // DateTimeOffset values via Npgsql; convert the local boundary to its
        // UTC instant for the query while keeping the local value for display.
        var queryStart = todayStart.ToUniversalTime();
        var queryEnd = todayEnd.ToUniversalTime();

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime != null
                && r.StartTime >= queryStart && r.StartTime < queryEnd)
            .OrderByDescending(r => r.StartTime)
            .ToListAsync(cancellationToken);

        var items = records.Select(AiRecordMapper.ToSummary).ToList();

        return new
        {
            date = todayStart.ToString("yyyy-MM-dd"),
            records = items,
            totalHours = Math.Round(items.Sum(i => i.DurationHours), 2),
            count = items.Count,
        };
    }
}

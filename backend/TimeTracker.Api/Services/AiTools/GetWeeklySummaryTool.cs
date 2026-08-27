using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.AiTools;

public class GetWeeklySummaryTool(AppDbContext db) : IAgentTool
{
    public string Name => "get_weekly_summary";

    public string Description =>
        "Returns a summary of the authenticated user's completed time records for a given week " +
        "(Monday-Sunday): total hours, hours per day, and hours per category.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["weekOffset"] = new Dictionary<string, object>
            {
                ["type"] = "integer",
                ["description"] = "0 = current week, -1 = previous week, etc. Range -8 to 0.",
            },
        },
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var weekOffset = AgentToolArgs.ReadClampedInt(args, "weekOffset", defaultValue: 0, min: -8, max: 0);

        var currentWeekStart = DateBoundaries.StartOfWeek(DateTimeOffset.Now);
        var weekStart = currentWeekStart.AddDays(weekOffset * 7);
        var weekEndExclusive = weekStart.AddDays(7);

        // Postgres 'timestamp with time zone' columns only accept UTC-offset
        // DateTimeOffset values via Npgsql; convert to UTC instants for the
        // query while keeping the local values for display and in-memory grouping.
        var queryStart = weekStart.ToUniversalTime();
        var queryEnd = weekEndExclusive.ToUniversalTime();

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime != null
                && r.StartTime >= queryStart && r.StartTime < queryEnd)
            .ToListAsync(cancellationToken);

        var byDay = Enumerable.Range(0, 7)
            .Select(offset =>
            {
                var dayStart = weekStart.AddDays(offset);
                var dayEnd = dayStart.AddDays(1);
                var hours = records
                    .Where(r => r.StartTime >= dayStart && r.StartTime < dayEnd)
                    .Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours);
                return new { date = dayStart.ToString("yyyy-MM-dd"), hours = Math.Round(hours, 2) };
            })
            .ToList();

        var byCategory = records
            .GroupBy(r => r.Category)
            .Select(g => new
            {
                category = g.Key,
                hours = Math.Round(g.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2),
                count = g.Count(),
            })
            .OrderByDescending(c => c.hours)
            .ToList();

        return new
        {
            weekStart = weekStart.ToString("yyyy-MM-dd"),
            weekEnd = weekEndExclusive.AddDays(-1).ToString("yyyy-MM-dd"),
            totalHours = Math.Round(records.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2),
            byDay,
            byCategory,
        };
    }
}

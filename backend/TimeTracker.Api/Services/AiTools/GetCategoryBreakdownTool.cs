using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.AiTools;

public class GetCategoryBreakdownTool(AppDbContext db) : IAgentTool
{
    public string Name => "get_category_breakdown";

    public string Description =>
        "Returns the authenticated user's completed time records grouped by category over a " +
        "lookback window, with total hours, record count, and percentage share per category.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["days"] = new Dictionary<string, object>
            {
                ["type"] = "integer",
                ["description"] = "Lookback window in days ending today. Default 30, max 365.",
            },
        },
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var days = AgentToolArgs.ReadClampedInt(args, "days", defaultValue: 30, min: 1, max: 365);

        var toExclusive = DateBoundaries.TodayStart.AddDays(1);
        var from = toExclusive.AddDays(-days);

        // Postgres 'timestamp with time zone' columns only accept UTC-offset
        // DateTimeOffset values via Npgsql; convert to UTC instants for the
        // query while keeping the local values for the from/to display strings.
        var queryFrom = from.ToUniversalTime();
        var queryTo = toExclusive.ToUniversalTime();

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime != null
                && r.StartTime >= queryFrom && r.StartTime < queryTo)
            .ToListAsync(cancellationToken);

        var totalHours = Math.Round(records.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2);

        var byCategory = records
            .GroupBy(r => r.Category)
            .Select(g =>
            {
                var hours = Math.Round(g.Sum(r => (r.EndTime!.Value - r.StartTime).TotalHours), 2);
                return new
                {
                    category = g.Key,
                    totalHours = hours,
                    count = g.Count(),
                    percentage = totalHours > 0 ? Math.Round(hours / totalHours * 100, 1) : 0,
                };
            })
            .OrderByDescending(c => c.totalHours)
            .ToList();

        return new
        {
            from = from.ToString("yyyy-MM-dd"),
            to = toExclusive.AddDays(-1).ToString("yyyy-MM-dd"),
            totalHours,
            byCategory,
        };
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.AiTools;

public class GetRecordsByDateRangeTool(AppDbContext db) : IAgentTool
{
    private const int MaxRangeDays = 92;

    public string Name => "get_records_by_date_range";

    public string Description =>
        "Returns the authenticated user's completed time records within an explicit date range " +
        $"(inclusive, max {MaxRangeDays} days).";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["from"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "Start date (inclusive), format YYYY-MM-DD.",
            },
            ["to"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "End date (inclusive), format YYYY-MM-DD.",
            },
        },
        ["required"] = new[] { "from", "to" },
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var fromStr = AgentToolArgs.ReadString(args, "from");
        var toStr = AgentToolArgs.ReadString(args, "to");

        if (!DateOnly.TryParse(fromStr, out var fromDate) || !DateOnly.TryParse(toStr, out var toDate))
        {
            return new { error = "Both 'from' and 'to' must be valid dates in YYYY-MM-DD format." };
        }

        if (toDate < fromDate)
        {
            return new { error = "'to' must be on or after 'from'." };
        }

        if (toDate.DayNumber - fromDate.DayNumber > MaxRangeDays)
        {
            return new { error = $"Date range too large; maximum is {MaxRangeDays} days." };
        }

        var rangeStart = DateBoundaries.LocalMidnight(fromDate);
        var rangeEndExclusive = DateBoundaries.LocalMidnight(toDate).AddDays(1);

        // Postgres 'timestamp with time zone' columns only accept UTC-offset
        // DateTimeOffset values via Npgsql; convert to UTC instants for the query.
        var queryStart = rangeStart.ToUniversalTime();
        var queryEnd = rangeEndExclusive.ToUniversalTime();

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime != null
                && r.StartTime >= queryStart && r.StartTime < queryEnd)
            .OrderByDescending(r => r.StartTime)
            .ToListAsync(cancellationToken);

        var items = records.Select(AiRecordMapper.ToSummary).ToList();

        return new
        {
            records = items,
            totalHours = Math.Round(items.Sum(i => i.DurationHours), 2),
            count = items.Count,
        };
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.AiTools;

public class GetRecentRecordsTool(AppDbContext db) : IAgentTool
{
    public string Name => "get_recent_records";

    public string Description =>
        "Returns the authenticated user's most recent completed time records, most recent first.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["limit"] = new Dictionary<string, object>
            {
                ["type"] = "integer",
                ["description"] = "Maximum number of records to return. Default 10, max 50.",
            },
        },
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var limit = AgentToolArgs.ReadClampedInt(args, "limit", defaultValue: 10, min: 1, max: 50);

        var records = await db.TimeRecords
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.EndTime != null)
            .OrderByDescending(r => r.StartTime)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var items = records.Select(AiRecordMapper.ToSummary).ToList();

        return new { records = items, count = items.Count };
    }
}

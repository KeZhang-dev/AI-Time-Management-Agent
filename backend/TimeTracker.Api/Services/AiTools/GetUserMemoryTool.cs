using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;

namespace TimeTracker.Api.Services.AiTools;

public class GetUserMemoryTool(AppDbContext db) : IAgentTool
{
    public string Name => "get_user_memory";

    public string Description =>
        "Returns long-term memory previously saved about the authenticated user (preferences, " +
        "recurring habits, goals) from the last 30 days. Use this when the user's request could " +
        "benefit from knowing something stable about them, not for looking up time records.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>(),
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-MemoryRetention.RetentionDays);

        var memories = await db.Memories
            .AsNoTracking()
            .Where(m => m.UserId == userId && (m.UpdatedAt ?? m.CreatedAt) >= cutoff)
            .OrderByDescending(m => m.UpdatedAt ?? m.CreatedAt)
            .Select(m => new { m.Content, savedAt = (m.UpdatedAt ?? m.CreatedAt) })
            .ToListAsync(cancellationToken);

        var items = memories
            .Select(m => new { content = m.Content, savedAt = m.savedAt.ToString("yyyy-MM-dd") })
            .ToList();

        return new { memories = items, count = items.Count };
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Models;

namespace TimeTracker.Api.Services.AiTools;

public class SaveUserMemoryTool(AppDbContext db) : IAgentTool
{
    private const int MinContentLength = 5;
    private const int MaxContentLength = 500;

    // Best-effort guard against the model being tricked into storing prompt-injection
    // payloads as "memory" that would later be replayed back into its own context via
    // get_user_memory. This is not a security boundary by itself (the real boundary is
    // that memory content is inert JSON data, and every query is scoped by userId) — it
    // just keeps obviously-adversarial content out of storage.
    private static readonly string[] BlockedPhrases =
    [
        "ignore previous instructions",
        "ignore all previous instructions",
        "disregard your instructions",
        "system prompt",
        "you are now",
        "act as",
        "jailbreak",
        "reveal your instructions",
        "print your prompt",
        "drop table",
        "delete from",
        "; --",
    ];

    public string Name => "save_user_memory";

    public string Description =>
        "Saves one durable, useful fact about the authenticated user for future conversations - " +
        "for example a stated preference, a recurring habit, or a long-term goal. Only call this " +
        "for information that is genuinely worth remembering long-term, not for greetings, ordinary " +
        "questions, temporary task details, or anything already retrievable via the time-record tools.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["content"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "A short, self-contained statement of the fact to remember " +
                    $"about the user ({MinContentLength}-{MaxContentLength} characters).",
            },
        },
        ["required"] = new[] { "content" },
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var content = AgentToolArgs.ReadString(args, "content")?.Trim();

        if (string.IsNullOrEmpty(content))
            return new { error = "'content' is required." };

        if (content.Length < MinContentLength)
            return new { error = $"'content' is too short to be a useful memory (minimum {MinContentLength} characters)." };

        if (content.Length > MaxContentLength)
            return new { error = $"'content' is too long (maximum {MaxContentLength} characters). Summarize it more concisely." };

        var lower = content.ToLowerInvariant();
        if (BlockedPhrases.Any(lower.Contains))
            return new { error = "This content cannot be saved as user memory." };

        // Opportunistic cleanup: since there is no background job runner in this app,
        // expired memories are pruned lazily whenever the user's memory is next written to,
        // scoped to that user only. This keeps retention enforcement simple and safe without
        // adding a scheduler just for this feature.
        var cutoff = DateTimeOffset.UtcNow.AddDays(-MemoryRetention.RetentionDays);
        await db.Memories
            .Where(m => m.UserId == userId && (m.UpdatedAt ?? m.CreatedAt) < cutoff)
            .ExecuteDeleteAsync(cancellationToken);

        var existing = await db.Memories
            .Where(m => m.UserId == userId)
            .ToListAsync(cancellationToken);

        var duplicate = existing.FirstOrDefault(m =>
            string.Equals(m.Content.Trim(), content, StringComparison.OrdinalIgnoreCase));

        if (duplicate is not null)
        {
            duplicate.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return new { status = "already_remembered", content = duplicate.Content };
        }

        var memory = new Memory
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Content = content,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Memories.Add(memory);
        await db.SaveChangesAsync(cancellationToken);

        return new { status = "saved", content = memory.Content };
    }
}

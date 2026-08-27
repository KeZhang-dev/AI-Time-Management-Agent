namespace TimeTracker.Api.Models;

public static class ConversationRole
{
    public const string User = "user";
    public const string Assistant = "assistant";
}

/// <summary>
/// One turn of the persisted Solution chat history, purely for UI continuity across
/// page visits. Does not participate in the Gemini tool-calling loop - each request
/// to /api/ai/analyze still starts a fresh single-turn conversation with Gemini,
/// exactly as before; these rows are only read back to redraw the chat on load.
/// ProposalId is a loose reference to ScheduleProposal - status is always resolved
/// live from that table when the conversation is loaded, never frozen at save time.
/// </summary>
public class ConversationMessage
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? OverviewJson { get; set; }
    public Guid? ProposalId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

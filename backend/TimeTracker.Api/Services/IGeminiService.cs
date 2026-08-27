namespace TimeTracker.Api.Services;

public interface IGeminiService
{
    Task<string> GenerateTextAsync(string prompt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a conversation turn to Gemini, optionally offering it tools to call.
    /// Returns either the final text answer or one or more function calls the
    /// caller must execute and feed back via a "function" role message before
    /// calling this again to continue the conversation.
    /// </summary>
    Task<GeminiTurn> GenerateContentAsync(
        IReadOnlyList<GeminiMessage> history,
        IReadOnlyList<GeminiToolDeclaration> tools,
        string? systemInstruction,
        CancellationToken cancellationToken = default);
}

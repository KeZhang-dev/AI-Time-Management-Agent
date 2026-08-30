namespace TimeTracker.Api.Services;

/// <summary>
/// Provider-agnostic boundary the agent talks to - GeminiService and DeepSeekService
/// both implement this. Callers (AiAgentService, AiController) never see provider-wire
/// details; those live entirely inside each implementation.
/// </summary>
public interface ILlmService
{
    /// <summary>
    /// Canonical lowercase id of the provider actually answering ("gemini"/"deepseek") -
    /// matches User.PreferredLlmProvider's comparison convention and the frontend's
    /// AI_MODEL_OPTIONS ids. Purely informational metadata for display purposes; never
    /// used to make any routing decision (Program.cs's ILlmService factory already
    /// decided that before this instance was resolved).
    /// </summary>
    string ProviderId { get; }

    Task<string> GenerateTextAsync(string prompt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a conversation turn to the model, optionally offering it tools to call.
    /// Returns either the final text answer or one or more function calls the
    /// caller must execute and feed back via a "function" role message before
    /// calling this again to continue the conversation.
    /// </summary>
    Task<LlmTurn> GenerateContentAsync(
        IReadOnlyList<LlmMessage> history,
        IReadOnlyList<LlmToolDeclaration> tools,
        string? systemInstruction,
        CancellationToken cancellationToken = default);
}

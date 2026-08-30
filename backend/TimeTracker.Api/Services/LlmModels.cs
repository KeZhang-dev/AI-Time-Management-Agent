using System.Text.Json;

namespace TimeTracker.Api.Services;

public enum LlmRole
{
    User,
    Model,
    Function,
}

public record LlmFunctionCallInfo(string Name, JsonElement Args)
{
    /// <summary>
    /// Opaque token some Gemini models attach to a function call; must be
    /// echoed back verbatim when the call is replayed in the next turn.
    /// Gemini-only - always null for other providers.
    /// </summary>
    public string? ThoughtSignature { get; init; }

    /// <summary>
    /// Provider-assigned call id (e.g. DeepSeek/OpenAI-style tool_calls[].id), used to
    /// correlate a function response back to the call it answers when a single turn
    /// contains multiple calls. Gemini has no such concept and correlates by Name
    /// alone within a turn, so this stays null on the Gemini path.
    /// </summary>
    public string? Id { get; init; }
}

public record LlmFunctionResponseInfo(string Name, object Response)
{
    /// <summary>Echo of the originating LlmFunctionCallInfo.Id, when the provider needs it.</summary>
    public string? Id { get; init; }
}

public record LlmMessagePart
{
    public string? Text { get; init; }
    public LlmFunctionCallInfo? FunctionCall { get; init; }
    public LlmFunctionResponseInfo? FunctionResponse { get; init; }
}

public record LlmMessage(LlmRole Role, IReadOnlyList<LlmMessagePart> Parts)
{
    public static LlmMessage FromText(LlmRole role, string text) =>
        new(role, [new LlmMessagePart { Text = text }]);

    public static LlmMessage FromFunctionResponse(string name, object response, string? id = null) =>
        new(LlmRole.Function, [new LlmMessagePart { FunctionResponse = new LlmFunctionResponseInfo(name, response) { Id = id } }]);
}

public record LlmToolDeclaration(string Name, string Description, object ParametersSchema);

/// <summary>
/// A single model turn: either the final text answer, or one or more tool
/// calls the caller must execute and feed back before asking the model to continue.
/// </summary>
public abstract record LlmTurn
{
    public sealed record Text(string Content) : LlmTurn;

    public sealed record FunctionCalls(IReadOnlyList<LlmFunctionCallInfo> Calls) : LlmTurn;
}

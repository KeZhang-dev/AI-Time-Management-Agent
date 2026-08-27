using System.Text.Json;

namespace TimeTracker.Api.Services;

public enum GeminiRole
{
    User,
    Model,
    Function,
}

public record GeminiFunctionCallInfo(string Name, JsonElement Args)
{
    /// <summary>
    /// Opaque token some Gemini models attach to a function call; must be
    /// echoed back verbatim when the call is replayed in the next turn.
    /// </summary>
    public string? ThoughtSignature { get; init; }
}

public record GeminiFunctionResponseInfo(string Name, object Response);

public record GeminiMessagePart
{
    public string? Text { get; init; }
    public GeminiFunctionCallInfo? FunctionCall { get; init; }
    public GeminiFunctionResponseInfo? FunctionResponse { get; init; }
}

public record GeminiMessage(GeminiRole Role, IReadOnlyList<GeminiMessagePart> Parts)
{
    public static GeminiMessage FromText(GeminiRole role, string text) =>
        new(role, [new GeminiMessagePart { Text = text }]);

    public static GeminiMessage FromFunctionResponse(string name, object response) =>
        new(GeminiRole.Function, [new GeminiMessagePart { FunctionResponse = new GeminiFunctionResponseInfo(name, response) }]);
}

public record GeminiToolDeclaration(string Name, string Description, object ParametersSchema);

/// <summary>
/// A single model turn: either the final text answer, or one or more tool
/// calls the caller must execute and feed back before asking Gemini to continue.
/// </summary>
public abstract record GeminiTurn
{
    public sealed record Text(string Content) : GeminiTurn;

    public sealed record FunctionCalls(IReadOnlyList<GeminiFunctionCallInfo> Calls) : GeminiTurn;
}

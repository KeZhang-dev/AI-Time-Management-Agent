using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TimeTracker.Api.Options;

namespace TimeTracker.Api.Services;

public class GeminiService(HttpClient httpClient, IOptions<GeminiOptions> geminiOptions) : IGeminiService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly JsonElement EmptyArgs = JsonDocument.Parse("{}").RootElement.Clone();

    private readonly GeminiOptions _options = geminiOptions.Value;

    public async Task<string> GenerateTextAsync(string prompt, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "Gemini API key is not configured. Set Gemini:ApiKey (see README for local setup).");
        }

        var requestUrl = $"{_options.BaseUrl}/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        var requestBody = new GeminiRequest([new GeminiContent([new GeminiPart(prompt)])]);

        using var response = await httpClient.PostAsJsonAsync(requestUrl, requestBody, JsonOptions, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Gemini API request failed ({(int)response.StatusCode}): {responseText}");
        }

        var result = JsonSerializer.Deserialize<GeminiResponse>(responseText, JsonOptions);
        var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

        if (string.IsNullOrEmpty(text))
            throw new InvalidOperationException("Gemini API returned no content.");

        return text;
    }

    public async Task<GeminiTurn> GenerateContentAsync(
        IReadOnlyList<GeminiMessage> history,
        IReadOnlyList<GeminiToolDeclaration> tools,
        string? systemInstruction,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "Gemini API key is not configured. Set Gemini:ApiKey (see README for local setup).");
        }

        var requestUrl = $"{_options.BaseUrl}/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        var requestBody = new GeminiToolRequest(
            history.Select(ToWireContent).ToList(),
            tools.Count == 0 ? null : [new GeminiToolWire(tools.Select(ToWireDeclaration).ToList())],
            systemInstruction is null ? null : new GeminiSystemInstructionWire([new GeminiToolPart { Text = systemInstruction }]));

        using var response = await httpClient.PostAsJsonAsync(requestUrl, requestBody, JsonOptions, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Gemini API request failed ({(int)response.StatusCode}): {responseText}");
        }

        var result = JsonSerializer.Deserialize<GeminiToolResponse>(responseText, JsonOptions);
        var parts = result?.Candidates?.FirstOrDefault()?.Content?.Parts;

        if (parts is null || parts.Count == 0)
            throw new InvalidOperationException("Gemini API returned no content.");

        var functionCalls = parts
            .Where(p => p.FunctionCall is not null)
            .Select(p => new GeminiFunctionCallInfo(p.FunctionCall!.Name, p.FunctionCall.Args ?? EmptyArgs)
            {
                ThoughtSignature = p.ThoughtSignature,
            })
            .ToList();

        if (functionCalls.Count > 0)
            return new GeminiTurn.FunctionCalls(functionCalls);

        var text = string.Concat(parts.Where(p => p.Text is not null).Select(p => p.Text));

        if (string.IsNullOrEmpty(text))
            throw new InvalidOperationException("Gemini API returned no content.");

        return new GeminiTurn.Text(text);
    }

    private static string RoleToWire(GeminiRole role) => role switch
    {
        GeminiRole.User => "user",
        GeminiRole.Model => "model",
        // This API's generateContent endpoint rejects role "function" (400
        // INVALID_ARGUMENT: "Role 'function' is not supported"); tool results
        // are sent back as a "user" turn carrying a functionResponse part instead.
        GeminiRole.Function => "user",
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, null),
    };

    private static GeminiToolContent ToWireContent(GeminiMessage message) => new(
        RoleToWire(message.Role),
        message.Parts.Select(ToWirePart).ToList());

    private static GeminiToolPart ToWirePart(GeminiMessagePart part) => new()
    {
        Text = part.Text,
        FunctionCall = part.FunctionCall is null
            ? null
            : new GeminiFunctionCallWire(part.FunctionCall.Name, part.FunctionCall.Args),
        FunctionResponse = part.FunctionResponse is null
            ? null
            : new GeminiFunctionResponseWire(part.FunctionResponse.Name, part.FunctionResponse.Response),
        // Newer Gemini models require the thought_signature from a functionCall
        // part to be echoed back verbatim on the following turn, or the API
        // rejects the request (400: "missing a thought_signature in functionCall parts").
        ThoughtSignature = part.FunctionCall?.ThoughtSignature,
    };

    private static GeminiFunctionDeclarationWire ToWireDeclaration(GeminiToolDeclaration declaration) => new(
        declaration.Name, declaration.Description, declaration.ParametersSchema);

    // Wire format for the plain-text path (GenerateTextAsync) — unchanged from before.
    private record GeminiRequest(GeminiContent[] Contents);

    private record GeminiContent(GeminiPart[] Parts);

    private record GeminiPart(string Text);

    private record GeminiResponse(GeminiCandidate[]? Candidates);

    private record GeminiCandidate(GeminiResponseContent? Content);

    private record GeminiResponseContent(GeminiPart[]? Parts);

    // Wire format for the tool-calling path (GenerateContentAsync).
    private record GeminiToolRequest(
        List<GeminiToolContent> Contents,
        List<GeminiToolWire>? Tools,
        GeminiSystemInstructionWire? SystemInstruction);

    private record GeminiToolContent(string Role, List<GeminiToolPart> Parts);

    private record GeminiToolPart
    {
        public string? Text { get; init; }
        public GeminiFunctionCallWire? FunctionCall { get; init; }
        public GeminiFunctionResponseWire? FunctionResponse { get; init; }
        public string? ThoughtSignature { get; init; }
    }

    private record GeminiFunctionCallWire(string Name, JsonElement? Args);

    private record GeminiFunctionResponseWire(string Name, object Response);

    private record GeminiToolWire(List<GeminiFunctionDeclarationWire> FunctionDeclarations);

    private record GeminiFunctionDeclarationWire(string Name, string Description, object Parameters);

    private record GeminiSystemInstructionWire(List<GeminiToolPart> Parts);

    private record GeminiToolResponse(List<GeminiToolCandidate>? Candidates);

    private record GeminiToolCandidate(GeminiToolResponseContent? Content);

    private record GeminiToolResponseContent(List<GeminiToolResponsePart>? Parts);

    private record GeminiToolResponsePart
    {
        public string? Text { get; init; }
        public GeminiFunctionCallWire? FunctionCall { get; init; }
        public string? ThoughtSignature { get; init; }
    }
}

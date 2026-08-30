using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TimeTracker.Api.Options;

namespace TimeTracker.Api.Services;

/// <summary>
/// DeepSeek implementation of ILlmService, talking to the official DeepSeek API (an
/// OpenAI-compatible chat-completions endpoint: https://api-docs.deepseek.com). Sibling to
/// GeminiService - same public contract, different wire format entirely private to this
/// class. Notable differences from Gemini's wire format, handled entirely here:
///   - Auth is a Bearer header, not a query-string key.
///   - There's a real "tool" role (no Gemini-style function-to-"user" remapping needed).
///   - The system instruction is a message in the array, not a separate request field.
///   - tool_calls carry a real id, which DOES need round-tripping onto the matching tool
///     result's tool_call_id (unlike Gemini, which correlates by name alone) - see
///     LlmFunctionCallInfo.Id / LlmFunctionResponseInfo.Id.
///   - Function arguments/results are JSON-encoded STRINGS on the wire, not nested objects.
/// </summary>
public class DeepSeekService(HttpClient httpClient, IOptions<DeepSeekOptions> deepSeekOptions) : ILlmService
{
    public string ProviderId => "deepseek";

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly JsonElement EmptyArgs = JsonDocument.Parse("{}").RootElement.Clone();

    private readonly DeepSeekOptions _options = deepSeekOptions.Value;

    public async Task<string> GenerateTextAsync(string prompt, CancellationToken cancellationToken = default)
    {
        var requestBody = new DeepSeekRequest(
            _options.Model,
            [new DeepSeekMessageWire { Role = "user", Content = prompt }],
            Tools: null);

        var result = await SendAsync(requestBody, cancellationToken);
        var text = result.Choices?.FirstOrDefault()?.Message?.Content;

        if (string.IsNullOrEmpty(text))
            throw new InvalidOperationException("DeepSeek API returned no content.");

        return text;
    }

    public async Task<LlmTurn> GenerateContentAsync(
        IReadOnlyList<LlmMessage> history,
        IReadOnlyList<LlmToolDeclaration> tools,
        string? systemInstruction,
        CancellationToken cancellationToken = default)
    {
        var messages = new List<DeepSeekMessageWire>();
        if (systemInstruction is not null)
            messages.Add(new DeepSeekMessageWire { Role = "system", Content = systemInstruction });
        messages.AddRange(history.Select(ToWireMessage));

        var requestBody = new DeepSeekRequest(
            _options.Model,
            messages,
            tools.Count == 0 ? null : tools.Select(ToWireDeclaration).ToList());

        var result = await SendAsync(requestBody, cancellationToken);
        var message = result.Choices?.FirstOrDefault()?.Message;

        if (message is null)
            throw new InvalidOperationException("DeepSeek API returned no content.");

        if (message.ToolCalls is { Count: > 0 } toolCalls)
        {
            var calls = toolCalls.Select(tc => new LlmFunctionCallInfo(
                tc.Function.Name,
                ParseArgs(tc.Function.Arguments))
            {
                Id = tc.Id,
            }).ToList();

            return new LlmTurn.FunctionCalls(calls);
        }

        if (string.IsNullOrEmpty(message.Content))
            throw new InvalidOperationException("DeepSeek API returned no content.");

        return new LlmTurn.Text(message.Content);
    }

    private async Task<DeepSeekResponse> SendAsync(DeepSeekRequest requestBody, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "DeepSeek API key is not configured. Set DeepSeek:ApiKey (see README for local setup).");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_options.BaseUrl}/chat/completions")
        {
            Content = JsonContent.Create(requestBody, options: JsonOptions),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"DeepSeek API request failed ({(int)response.StatusCode}): {responseText}");
        }

        return JsonSerializer.Deserialize<DeepSeekResponse>(responseText, JsonOptions)
            ?? throw new InvalidOperationException("DeepSeek API returned no content.");
    }

    private static JsonElement ParseArgs(string argumentsJson)
    {
        if (string.IsNullOrWhiteSpace(argumentsJson))
            return EmptyArgs;

        try
        {
            return JsonDocument.Parse(argumentsJson).RootElement.Clone();
        }
        catch (JsonException)
        {
            return EmptyArgs;
        }
    }

    private static DeepSeekMessageWire ToWireMessage(LlmMessage message)
    {
        if (message.Role == LlmRole.Function)
        {
            // Built exclusively by LlmMessage.FromFunctionResponse - always exactly one part.
            var functionResponse = message.Parts[0].FunctionResponse!;
            return new DeepSeekMessageWire
            {
                Role = "tool",
                ToolCallId = functionResponse.Id,
                Content = JsonSerializer.Serialize(functionResponse.Response, JsonOptions),
            };
        }

        var functionCalls = message.Parts.Where(p => p.FunctionCall is not null).Select(p => p.FunctionCall!).ToList();
        if (functionCalls.Count > 0)
        {
            return new DeepSeekMessageWire
            {
                Role = "assistant",
                ToolCalls = functionCalls.Select(fc => new DeepSeekToolCallWire(
                    // fc.Id is only ever null if this history was somehow produced by a
                    // different provider - shouldn't happen (a conversation always stays on
                    // one provider), but fall back to a fresh id rather than send a null one.
                    fc.Id ?? Guid.NewGuid().ToString("N"),
                    "function",
                    new DeepSeekFunctionCallWire(fc.Name, JsonSerializer.Serialize(fc.Args, JsonOptions))
                )).ToList(),
            };
        }

        var text = string.Concat(message.Parts.Where(p => p.Text is not null).Select(p => p.Text));
        return new DeepSeekMessageWire { Role = RoleToWire(message.Role), Content = text };
    }

    private static string RoleToWire(LlmRole role) => role switch
    {
        LlmRole.User => "user",
        LlmRole.Model => "assistant",
        LlmRole.Function => "tool",
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, null),
    };

    private static DeepSeekToolWire ToWireDeclaration(LlmToolDeclaration declaration) => new(
        "function", new DeepSeekFunctionDeclarationWire(declaration.Name, declaration.Description, declaration.ParametersSchema));

    // Wire format - OpenAI-compatible chat completions with tool calling.
    private record DeepSeekRequest(string Model, List<DeepSeekMessageWire> Messages, List<DeepSeekToolWire>? Tools);

    private record DeepSeekMessageWire
    {
        public required string Role { get; init; }
        public string? Content { get; init; }

        [JsonPropertyName("tool_calls")]
        public List<DeepSeekToolCallWire>? ToolCalls { get; init; }

        [JsonPropertyName("tool_call_id")]
        public string? ToolCallId { get; init; }
    }

    private record DeepSeekToolCallWire(string Id, string Type, [property: JsonPropertyName("function")] DeepSeekFunctionCallWire Function);

    private record DeepSeekFunctionCallWire(string Name, string Arguments);

    private record DeepSeekToolWire(string Type, [property: JsonPropertyName("function")] DeepSeekFunctionDeclarationWire Function);

    private record DeepSeekFunctionDeclarationWire(string Name, string Description, object Parameters);

    private record DeepSeekResponse(List<DeepSeekChoice>? Choices);

    private record DeepSeekChoice(DeepSeekResponseMessage? Message);

    private record DeepSeekResponseMessage(string? Content, [property: JsonPropertyName("tool_calls")] List<DeepSeekToolCallWire>? ToolCalls);
}

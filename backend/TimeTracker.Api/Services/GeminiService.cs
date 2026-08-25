using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TimeTracker.Api.Options;

namespace TimeTracker.Api.Services;

public class GeminiService(HttpClient httpClient, IOptions<GeminiOptions> geminiOptions) : IGeminiService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

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

    private record GeminiRequest(GeminiContent[] Contents);

    private record GeminiContent(GeminiPart[] Parts);

    private record GeminiPart(string Text);

    private record GeminiResponse(GeminiCandidate[]? Candidates);

    private record GeminiCandidate(GeminiResponseContent? Content);

    private record GeminiResponseContent(GeminiPart[]? Parts);
}

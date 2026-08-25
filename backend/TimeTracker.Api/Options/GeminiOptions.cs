namespace TimeTracker.Api.Options;

public class GeminiOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "gemini-3.5-flash-lite";
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
}

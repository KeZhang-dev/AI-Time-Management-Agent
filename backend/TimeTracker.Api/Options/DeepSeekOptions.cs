namespace TimeTracker.Api.Options;

public class DeepSeekOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "deepseek-v4-flash";
    public string BaseUrl { get; set; } = "https://api.deepseek.com";
}

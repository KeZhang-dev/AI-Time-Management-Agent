namespace TimeTracker.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User";

    /// <summary>Editable display name, distinct from the login identifier (Username).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Avatar image as a data URL (e.g. "data:image/png;base64,...") - no separate blob storage exists yet.</summary>
    public string? AvatarDataUrl { get; set; }

    /// <summary>
    /// Which ILlmService implementation answers this user's chat requests - "Gemini" or
    /// "DeepSeek" (case-insensitive), resolved per-request by Program.cs's ILlmService
    /// factory. Falls back to the server-wide Llm:Provider config value if unrecognized.
    /// </summary>
    public string PreferredLlmProvider { get; set; } = "Gemini";

    public DateTimeOffset CreatedAt { get; set; }
}

namespace TimeTracker.Api.Services;

public interface IGeminiService
{
    Task<string> GenerateTextAsync(string prompt, CancellationToken cancellationToken = default);
}

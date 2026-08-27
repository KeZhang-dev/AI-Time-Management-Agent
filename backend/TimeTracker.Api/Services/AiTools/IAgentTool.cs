using System.Text.Json;

namespace TimeTracker.Api.Services.AiTools;

/// <summary>
/// A single read-only capability exposed to Gemini as a function declaration.
/// Implementations must scope every query to the <paramref name="userId"/> passed
/// in by the caller — that value always comes from the authenticated JWT, never
/// from the model, and tool parameter schemas must never declare a user id field.
/// </summary>
public interface IAgentTool
{
    string Name { get; }
    string Description { get; }
    object ParametersSchema { get; }

    Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken);
}

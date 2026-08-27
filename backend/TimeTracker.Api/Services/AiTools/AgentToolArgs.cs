using System.Text.Json;

namespace TimeTracker.Api.Services.AiTools;

/// <summary>
/// Defensive readers for model-supplied tool arguments. Missing or malformed
/// values fall back to the provided default rather than throwing, since a
/// slightly-off argument from the model shouldn't fail the whole request.
/// </summary>
internal static class AgentToolArgs
{
    public static int ReadClampedInt(JsonElement args, string propertyName, int defaultValue, int min, int max)
    {
        if (args.ValueKind == JsonValueKind.Object && args.TryGetProperty(propertyName, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var numberValue))
                return Math.Clamp(numberValue, min, max);

            if (prop.ValueKind == JsonValueKind.String && int.TryParse(prop.GetString(), out var stringValue))
                return Math.Clamp(stringValue, min, max);
        }

        return Math.Clamp(defaultValue, min, max);
    }

    public static string? ReadString(JsonElement args, string propertyName)
    {
        if (args.ValueKind == JsonValueKind.Object &&
            args.TryGetProperty(propertyName, out var prop) &&
            prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
        }

        return null;
    }
}

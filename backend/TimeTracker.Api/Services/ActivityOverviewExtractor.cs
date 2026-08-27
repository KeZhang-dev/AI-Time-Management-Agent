using System.Text.Json;
using TimeTracker.Api.Dtos;

namespace TimeTracker.Api.Services;

/// <summary>
/// Opportunistically turns a TimeRecord tool's already-computed result into a
/// compact ActivityOverviewDto for the chat UI - without touching the tools
/// themselves. It only reads well-known field names out of the JSON shape each
/// tool already returns (the same JSON that gets sent back to Gemini as the
/// function response), so none of the IAgentTool implementations change.
/// </summary>
public static class ActivityOverviewExtractor
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private static readonly Dictionary<string, string> Labels = new(StringComparer.Ordinal)
    {
        ["get_today_records"] = "Today's Overview",
        ["get_recent_records"] = "Recent Activity",
        ["get_weekly_summary"] = "This Week",
        ["get_category_breakdown"] = "Recent Activity",
        ["get_records_by_date_range"] = "Selected Range",
    };

    public static ActivityOverviewDto? TryExtract(string toolName, object toolResult)
    {
        if (!Labels.TryGetValue(toolName, out var label))
            return null;

        JsonElement root;
        try
        {
            root = JsonSerializer.SerializeToElement(toolResult, JsonOptions);
        }
        catch (NotSupportedException)
        {
            return null;
        }

        if (root.ValueKind != JsonValueKind.Object)
            return null;

        if (root.TryGetProperty("byCategory", out var byCategoryEl) && byCategoryEl.ValueKind == JsonValueKind.Array)
            return FromCategoryBreakdown(label, root, byCategoryEl);

        if (root.TryGetProperty("records", out var recordsEl) && recordsEl.ValueKind == JsonValueKind.Array)
            return FromRecords(label, root, recordsEl);

        return null;
    }

    private static ActivityOverviewDto? FromCategoryBreakdown(string label, JsonElement root, JsonElement byCategoryEl)
    {
        var items = new List<ActivityCategoryShareDto>();
        foreach (var item in byCategoryEl.EnumerateArray())
        {
            var category = GetString(item, "category");
            if (string.IsNullOrWhiteSpace(category))
                continue;

            var hours = GetDouble(item, "hours") ?? GetDouble(item, "totalHours") ?? 0;
            var count = GetInt(item, "count") ?? 0;
            items.Add(new ActivityCategoryShareDto(category, Math.Round(hours, 2), count));
        }

        if (items.Count == 0)
            return null;

        var totalHours = GetDouble(root, "totalHours") ?? items.Sum(i => i.Hours);
        var recordCount = items.Sum(i => i.Count);

        return new ActivityOverviewDto(label, Math.Round(totalHours, 2), recordCount, items);
    }

    private static ActivityOverviewDto? FromRecords(string label, JsonElement root, JsonElement recordsEl)
    {
        var grouped = new Dictionary<string, (double Hours, int Count)>(StringComparer.OrdinalIgnoreCase);
        foreach (var record in recordsEl.EnumerateArray())
        {
            var category = GetString(record, "category");
            if (string.IsNullOrWhiteSpace(category))
                continue;

            var duration = GetDouble(record, "durationHours") ?? 0;
            var (hours, count) = grouped.TryGetValue(category, out var existing) ? existing : (0, 0);
            grouped[category] = (hours + duration, count + 1);
        }

        if (grouped.Count == 0)
            return null;

        var items = grouped
            .Select(kv => new ActivityCategoryShareDto(kv.Key, Math.Round(kv.Value.Hours, 2), kv.Value.Count))
            .OrderByDescending(i => i.Hours)
            .ToList();

        var totalHours = GetDouble(root, "totalHours") ?? items.Sum(i => i.Hours);
        var recordCount = GetInt(root, "count") ?? items.Sum(i => i.Count);

        return new ActivityOverviewDto(label, Math.Round(totalHours, 2), recordCount, items);
    }

    private static string? GetString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    private static double? GetDouble(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.Number ? p.GetDouble() : null;

    private static int? GetInt(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.Number ? p.GetInt32() : null;
}

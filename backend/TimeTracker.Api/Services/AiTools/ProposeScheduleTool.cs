using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;
using TimeTracker.Api.Services.Scheduling;

namespace TimeTracker.Api.Services.AiTools;

/// <summary>
/// Lets the agent STAGE a structured schedule recommendation. This never creates
/// anything in the user's real schedule - it only records a Pending proposal that
/// the authenticated user must explicitly approve via
/// ScheduleProposalsController.Approve before any Schedule row is created. This is
/// the only boundary that matters: the approval step lives entirely outside the
/// Gemini tool-calling loop, so the model has no path to execute a schedule change.
/// </summary>
public class ProposeScheduleTool(AppDbContext db) : IAgentTool
{
    private static readonly TimeSpan ProposalLifetime = TimeSpan.FromHours(2);

    public string Name => "propose_schedule";

    public string Description =>
        "Stages a structured schedule recommendation for the user to review in the app. This does " +
        "NOT create or modify the user's actual schedule - nothing is saved until the user explicitly " +
        "approves it through the app's UI. Always call this tool (instead of describing a schedule in " +
        "prose) whenever you want to recommend a concrete plan with specific times.";

    public object ParametersSchema => new Dictionary<string, object>
    {
        ["type"] = "object",
        ["properties"] = new Dictionary<string, object>
        {
            ["title"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "Short title for the plan, e.g. 'Evening Plan'.",
            },
            ["date"] = new Dictionary<string, object>
            {
                ["type"] = "string",
                ["description"] = "Date the schedule applies to, format YYYY-MM-DD.",
            },
            ["items"] = new Dictionary<string, object>
            {
                ["type"] = "array",
                ["description"] = "Ordered list of schedule blocks covering the requested time.",
                ["items"] = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["startTime"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "24-hour local time, format HH:mm.",
                        },
                        ["endTime"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "24-hour local time, format HH:mm. Use \"00:00\" if this " +
                                "block runs until midnight.",
                        },
                        ["activity"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "What to do in this block.",
                        },
                        ["reason"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "Brief reason tied to the user's data or request.",
                        },
                    },
                    ["required"] = new[] { "startTime", "endTime", "activity" },
                },
            },
        },
        ["required"] = new[] { "title", "date", "items" },
    };

    public async Task<object> ExecuteAsync(Guid userId, JsonElement args, CancellationToken cancellationToken)
    {
        var title = AgentToolArgs.ReadString(args, "title")?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            return new { error = "'title' is required." };

        if (!DateOnly.TryParse(AgentToolArgs.ReadString(args, "date"), out var date))
            return new { error = "'date' must be a valid date in YYYY-MM-DD format." };

        if (args.ValueKind != JsonValueKind.Object ||
            !args.TryGetProperty("items", out var itemsElement) ||
            itemsElement.ValueKind != JsonValueKind.Array)
        {
            return new { error = "'items' must be a non-empty array of schedule blocks." };
        }

        var parsedItems = new List<(TimeOnly Start, TimeOnly End, string Activity, string? Reason)>();
        foreach (var itemElement in itemsElement.EnumerateArray())
        {
            var activity = AgentToolArgs.ReadString(itemElement, "activity")?.Trim();
            var reason = AgentToolArgs.ReadString(itemElement, "reason")?.Trim();

            if (!TimeOnly.TryParse(AgentToolArgs.ReadString(itemElement, "startTime"), out var start) ||
                !TimeOnly.TryParse(AgentToolArgs.ReadString(itemElement, "endTime"), out var end) ||
                string.IsNullOrWhiteSpace(activity))
            {
                return new { error = "Each item needs a valid startTime, endTime (HH:mm), and activity." };
            }

            parsedItems.Add((start, end, activity, string.IsNullOrWhiteSpace(reason) ? null : reason));
        }

        // Server-local "now" (same closest-available-proxy convention as DateBoundaries),
        // passed into Validate so a same-day plan is deterministically rejected if it
        // starts in the past - this is the actual enforcement, not just a prompt hint.
        var localNow = DateTimeOffset.Now;
        var today = DateOnly.FromDateTime(localNow.Date);
        var validationError = ScheduleValidation.Validate(
            date,
            parsedItems.Select(i => (i.Start, i.End, i.Activity)).ToList(),
            today,
            TimeOnly.FromDateTime(localNow.DateTime));

        if (validationError is not null)
            return new { error = validationError };

        var now = DateTimeOffset.UtcNow;

        // Opportunistic cleanup: mark this user's own stale pending proposals as expired.
        // Mirrors the Memory tools' lazy-cleanup pattern - no background job runner in this app.
        await db.ScheduleProposals
            .Where(p => p.UserId == userId && p.Status == ScheduleProposalStatus.Pending && p.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, ScheduleProposalStatus.Expired), cancellationToken);

        var itemDtos = parsedItems
            .OrderBy(i => i.Start)
            .Select(i => new ScheduleItemDto(i.Start.ToString("HH:mm"), i.End.ToString("HH:mm"), i.Activity, i.Reason))
            .ToList();

        var proposal = new ScheduleProposal
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Date = date,
            ItemsJson = JsonSerializer.Serialize(itemDtos),
            Status = ScheduleProposalStatus.Pending,
            CreatedAt = now,
            ExpiresAt = now.Add(ProposalLifetime),
        };

        db.ScheduleProposals.Add(proposal);
        await db.SaveChangesAsync(cancellationToken);

        return new ScheduleProposalDto(proposal.Id, proposal.Title, proposal.Date.ToString("yyyy-MM-dd"), itemDtos);
    }
}

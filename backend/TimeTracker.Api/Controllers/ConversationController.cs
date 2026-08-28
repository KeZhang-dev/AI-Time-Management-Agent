using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeTracker.Api.Data;
using TimeTracker.Api.Dtos;
using TimeTracker.Api.Models;

namespace TimeTracker.Api.Controllers;

/// <summary>
/// Read-only view over the persisted Solution chat history for the authenticated
/// user. Proposal status is always resolved live from ScheduleProposals here, never
/// from a frozen snapshot, so a reloaded conversation reflects Apply/Cancel actions
/// taken after the message was first saved.
/// </summary>
[Authorize]
[ApiController]
[Route("api/conversation")]
public class ConversationController(AppDbContext db) : ControllerBase
{
    private const int MaxMessages = 200;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ConversationMessageDto>>> Get(CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        var recent = await db.ConversationMessages
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(MaxMessages)
            .ToListAsync(cancellationToken);

        var messages = recent.OrderBy(m => m.CreatedAt).ToList();

        var proposalIds = messages
            .Where(m => m.ProposalId != null)
            .Select(m => m.ProposalId!.Value)
            .Distinct()
            .ToList();

        var proposals = proposalIds.Count == 0
            ? new Dictionary<Guid, ScheduleProposal>()
            : await db.ScheduleProposals
                .AsNoTracking()
                .Where(p => proposalIds.Contains(p.Id) && p.UserId == userId)
                .ToDictionaryAsync(p => p.Id, cancellationToken);

        return Ok(messages.Select(m => ToDto(m, proposals)).ToList());
    }

    private static ConversationMessageDto ToDto(ConversationMessage message, IReadOnlyDictionary<Guid, ScheduleProposal> proposals)
    {
        var overview = message.OverviewJson is null
            ? null
            : JsonSerializer.Deserialize<ActivityOverviewDto>(message.OverviewJson, JsonOptions);

        ScheduleProposalDto? proposalDto = null;
        string? proposalStatus = null;

        if (message.ProposalId is { } proposalId && proposals.TryGetValue(proposalId, out var proposal))
        {
            var items = JsonSerializer.Deserialize<List<ScheduleItemDto>>(proposal.ItemsJson, JsonOptions) ?? [];
            proposalDto = new ScheduleProposalDto(proposal.Id, proposal.Title, proposal.Date.ToString("yyyy-MM-dd"), items);
            proposalStatus = proposal.Status switch
            {
                ScheduleProposalStatus.Approved => "approved",
                ScheduleProposalStatus.Pending => "pending",
                _ => "cancelled",
            };
        }

        return new ConversationMessageDto(
            message.Id, message.Role, message.Content, message.CreatedAt, overview, proposalDto, proposalStatus);
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

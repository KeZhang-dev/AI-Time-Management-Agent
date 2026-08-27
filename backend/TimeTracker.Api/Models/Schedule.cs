namespace TimeTracker.Api.Models;

/// <summary>
/// A concrete, applied schedule block. Only ever created by
/// ScheduleProposalsController after the authenticated user explicitly
/// approves a pending ScheduleProposal - never written to directly by the agent.
/// </summary>
public class Schedule
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string Activity { get; set; } = string.Empty;
    public Guid? ProposalId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

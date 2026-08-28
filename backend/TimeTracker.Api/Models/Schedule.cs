namespace TimeTracker.Api.Models;

/// <summary>
/// A concrete, applied schedule block. Only ever created by
/// ScheduleProposalsController after the authenticated user explicitly
/// approves a pending ScheduleProposal - never written to directly by the agent.
/// Title/Description are copied from the proposal at approval time and then
/// become independently editable - once applied, a Schedule is its own record
/// and no longer tracks the proposal for future changes (ProposalId remains
/// only as an audit trail of what it was created from, and is also the stable
/// grouping key for the several Schedule rows that make up one applied plan).
/// </summary>
public class Schedule
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string Activity { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ProposalId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

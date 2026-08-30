namespace TimeTracker.Api.Models;

public static class ScheduleProposalStatus
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";

    /// <summary>Re-validation at approval time failed unexpectedly; treated as terminal.</summary>
    public const string Failed = "Failed";
}

/// <summary>
/// A schedule recommendation staged by the agent (via the propose_schedule tool)
/// that has NOT been applied yet. Items are stored as serialized ScheduleItemDto
/// JSON rather than a related table, since a proposal is a short-lived, disposable
/// draft - not a durable domain entity in its own right.
/// </summary>
public class ScheduleProposal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public string ItemsJson { get; set; } = "[]";
    public string Status { get; set; } = ScheduleProposalStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }

    /// <summary>
    /// Set once ScheduleOutcomeEvaluator has compared this plan's Schedule items against
    /// the actual TimeRecords for its Date (only meaningful once Status is Approved and
    /// Date is in the past). Lazily populated by CheckinSeedBuilder - null means "not
    /// evaluated yet", not "nothing to evaluate".
    /// </summary>
    public DateTimeOffset? OutcomeEvaluatedAt { get; set; }

    /// <summary>Serialized ScheduleOutcomeEvaluator.PlanOutcome, set alongside OutcomeEvaluatedAt.</summary>
    public string? OutcomeSummaryJson { get; set; }
}

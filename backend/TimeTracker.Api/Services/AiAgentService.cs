using TimeTracker.Api.Dtos;
using TimeTracker.Api.Services.AiTools;
using TimeTracker.Api.Services.Scheduling;

namespace TimeTracker.Api.Services;

/// <summary>
/// Result of one agent turn: the text reply, plus a staged schedule proposal and/or
/// an activity overview snapshot if the tool loop produced one. Both are purely for
/// display - neither changes how the tool-calling loop itself behaves.
/// </summary>
public record AiAgentResult(string ResponseText, ScheduleProposalDto? Proposal, ActivityOverviewDto? Overview);

/// <summary>
/// Drives the tool-calling loop: sends the user's message to Gemini, executes
/// any tools Gemini requests (always scoped to the caller-supplied userId,
/// never a model-supplied value), feeds results back, and repeats until
/// Gemini returns a final text answer or the iteration cap is hit.
/// </summary>
public class AiAgentService(
    IGeminiService geminiService,
    AgentToolRegistry toolRegistry,
    SchedulePatternService schedulePatternService,
    ILogger<AiAgentService> logger)
{
    // Headroom for: observation call(s) -> propose_schedule -> (possibly rejected by
    // ScheduleValidation's past-start check) -> corrected retry -> final text.
    private const int MaxToolIterations = 6;

    private const string SystemInstructionTemplate = """
        You are KONER, an AI assistant inside a personal time-tracking app. Help the user
        understand their own tracked time. Use the available tools whenever a question requires
        looking at the user's time records or statistics - never guess or fabricate data. If a
        question does not require data (e.g. greetings or general questions about the app), answer
        directly without calling a tool. Be concise, specific, and encouraging. If the tools don't
        return enough information to answer, say so honestly rather than guessing.

        Write your replies in clean, concise Markdown: use **bold** for emphasis, short paragraphs,
        and bullet or numbered lists where they genuinely help. Do not put every sentence on its
        own line - use natural conversational formatting, not a wall of forced line breaks.

        The current date and time is {{CURRENT_TIME}} (24-hour clock, local time). When the user
        asks you to plan or schedule something "now", "tonight", "for the rest of the day", or
        gives a duration like "I have 2 hours left" without stating an explicit start time, use
        this current time as the starting point - not a generic evening block from your training
        data. For example, if it is currently 22:00 and the user has 2 hours left, the schedule
        must run from 22:00 to 00:00, not some earlier window. Only use a different start time if
        the user explicitly states one. A schedule may run past midnight - when a block ends
        exactly at midnight, use "00:00" as its endTime, and keep the schedule's date as today's
        date (the date the plan starts on) even though it ends at 00:00.

        You also have access to long-term memory about this user (get_user_memory and
        save_user_memory). Memory holds stable, user-specific facts - preferences, recurring
        habits, long-term goals - that can help you personalize your answer. Call get_user_memory
        when it could plausibly help you tailor the response (for example, planning or advice
        requests), but not for simple greetings or one-off factual lookups that don't need
        personalization. Call save_user_memory only when the user shares something genuinely
        durable about themselves, or explicitly asks you to remember something - never for
        greetings, ordinary questions, temporary task details, raw conversation content, or
        anything already retrievable via the time-record tools.

        You also have log_time_activity, to start, stop, or retroactively log the user's own
        tracked activity when they tell you about it in natural language - e.g. "I'm going to
        study now" (action "start"), "I'm heading out" or "I'm done for now" (action "stop"),
        or "I went to bed at 11:15 and woke up at 8:50" (action "log", category "Sleep"). Call
        it whenever the user is clearly describing something they are doing, about to do, or
        just finished doing in real time - not for hypothetical questions ("what if I studied
        for two hours?") or requests to just look something up. This creates or closes a plain
        TimeRecord - it is operational tracking state, completely separate from long-term
        memory, so never call save_user_memory for this, even if the activity sounds like a
        habit worth remembering. When logging an overnight span like sleep, if the stated
        bedtime is evening/night and the wake time is numerically earlier in the day, it spans
        midnight: use yesterday's date for startTime and today's date for endTime.

        You can also help the user improve their schedule. When they ask for planning or
        scheduling help (e.g. "help me plan my evening", "suggest a schedule for tomorrow",
        "improve my schedule"), first use the relevant read-only tools - time records and/or
        memory - to understand their actual situation, then reason about a concrete improvement.
        When you have a concrete plan, call propose_schedule with the structured schedule instead
        of just describing it in prose. The user does NOT need to give you specific tasks,
        deadlines, or goals before you can do this - a time constraint alone (e.g. "I have 4 hours
        tonight", "I'm free 7pm to 11pm") is enough to attempt a reasonable recommendation. Use the
        read-only tools to see what the user actually tends to spend time on and any stated
        preferences, then build a concrete plan around that; do not refuse or ask clarifying
        questions just because the user didn't list specific tasks. If some detail is still
        genuinely missing, make a reasonable assumption instead of stopping, and say so plainly in
        your explanation (e.g. "since you didn't specify a task, I've blocked time for focused work
        based on your recent activity"). Only skip propose_schedule and ask a clarifying question
        if the request has no usable time constraint at all and the user's data gives you nothing
        to build on.

        Build realistic plans, not a mechanical division of the available time into equal
        generic blocks. Favor session lengths that match how the user actually works (commonly
        25-90 focused minutes before a break, shorter for anything the data suggests they
        struggle to sustain), include short breaks or a change of activity between longer
        blocks, and vary block length and activity based on what get_user_memory and the
        time-record tools tell you about this specific user - including any pattern noted from
        how past schedules actually went (e.g. a block that's repeatedly cut short). Give each
        block a brief reason tied to that evidence, not a generic label. End your explanation by
        asking "Create this schedule?" so the user knows a decision is needed.

        propose_schedule only STAGES a recommendation in the
        app - it does not create or change anything in the user's real schedule. After calling it,
        briefly explain your reasoning and make clear this is only a recommendation that needs the
        user's explicit approval in the app (e.g. an "Apply Schedule" button) before anything is
        saved. Never say the schedule has been applied, and never ask the user to just reply "yes"
        in chat to approve it - approval happens through the app's UI, not through this
        conversation, and you have no way to execute it yourself.
        """;

    /// <summary>
    /// Rebuilt per request (not cached) so the injected clock reading is always fresh -
    /// this is what lets "I have 2 hours left" resolve against the actual current time
    /// instead of a stale or generic default. Also appends a deterministic summary of how
    /// this user's past schedules actually went (SchedulePatternService), when there's
    /// enough evaluated history to say anything - this is what closes the schedule
    /// feedback loop on every turn, not just the proactive daily check-in.
    /// </summary>
    private async Task<string> BuildSystemInstructionAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Server-local time: the app has no per-user timezone stored anywhere, so this
        // is the same "closest available proxy" convention the TimeRecord tools use
        // (see DateBoundaries) rather than UTC.
        var currentTime = DateTimeOffset.Now.ToString("dddd, yyyy-MM-dd HH:mm");
        var instruction = SystemInstructionTemplate.Replace("{{CURRENT_TIME}}", currentTime);

        var patterns = await schedulePatternService.SummarizeRecentPatternsAsync(userId, cancellationToken);
        if (patterns is not null)
            instruction += "\n\n" + patterns;

        return instruction;
    }

    public async Task<AiAgentResult> HandleUserMessageAsync(Guid userId, string userMessage, CancellationToken cancellationToken)
    {
        var history = new List<GeminiMessage> { GeminiMessage.FromText(GeminiRole.User, userMessage) };
        var tools = toolRegistry.Declarations;
        var systemInstruction = await BuildSystemInstructionAsync(userId, cancellationToken);
        ScheduleProposalDto? proposal = null;
        ActivityOverviewDto? overview = null;

        for (var iteration = 0; iteration < MaxToolIterations; iteration++)
        {
            var turn = await geminiService.GenerateContentAsync(history, tools, systemInstruction, cancellationToken);

            if (turn is GeminiTurn.Text text)
                return new AiAgentResult(text.Content, proposal, overview);

            var calls = ((GeminiTurn.FunctionCalls)turn).Calls;

            foreach (var call in calls)
                logger.LogInformation("Gemini requested tool {ToolName} with args {Args}", call.Name, call.Args);

            history.Add(new GeminiMessage(
                GeminiRole.Model,
                calls.Select(c => new GeminiMessagePart { FunctionCall = c }).ToList()));

            foreach (var call in calls)
            {
                object result;
                try
                {
                    var tool = toolRegistry.Find(call.Name);
                    result = tool is null
                        ? new { error = $"Unknown tool '{call.Name}'." }
                        : await tool.ExecuteAsync(userId, call.Args, cancellationToken);

                    if (call.Name == "propose_schedule" && result is ScheduleProposalDto proposalDto)
                        proposal = proposalDto;

                    overview = ActivityOverviewExtractor.TryExtract(call.Name, result) ?? overview;
                }
                catch (Exception ex)
                {
                    result = new { error = $"Tool '{call.Name}' failed: {ex.Message}" };
                }

                history.Add(GeminiMessage.FromFunctionResponse(call.Name, result));
            }
        }

        return new AiAgentResult(
            "I wasn't able to finish looking that up just now — could you try rephrasing your question?",
            proposal,
            overview);
    }
}

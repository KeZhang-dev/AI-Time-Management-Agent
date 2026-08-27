using TimeTracker.Api.Services.AiTools;

namespace TimeTracker.Api.Services;

/// <summary>
/// Drives the tool-calling loop: sends the user's message to Gemini, executes
/// any tools Gemini requests (always scoped to the caller-supplied userId,
/// never a model-supplied value), feeds results back, and repeats until
/// Gemini returns a final text answer or the iteration cap is hit.
/// </summary>
public class AiAgentService(IGeminiService geminiService, AgentToolRegistry toolRegistry, ILogger<AiAgentService> logger)
{
    private const int MaxToolIterations = 4;

    private const string SystemInstruction = """
        You are KONER, an AI assistant inside a personal time-tracking app. Help the user
        understand their own tracked time. Use the available tools whenever a question requires
        looking at the user's time records or statistics - never guess or fabricate data. If a
        question does not require data (e.g. greetings or general questions about the app), answer
        directly without calling a tool. Be concise, specific, and encouraging. If the tools don't
        return enough information to answer, say so honestly rather than guessing.

        You also have access to long-term memory about this user (get_user_memory and
        save_user_memory). Memory holds stable, user-specific facts - preferences, recurring
        habits, long-term goals - that can help you personalize your answer. Call get_user_memory
        when it could plausibly help you tailor the response (for example, planning or advice
        requests), but not for simple greetings or one-off factual lookups that don't need
        personalization. Call save_user_memory only when the user shares something genuinely
        durable about themselves, or explicitly asks you to remember something - never for
        greetings, ordinary questions, temporary task details, raw conversation content, or
        anything already retrievable via the time-record tools.
        """;

    public async Task<string> HandleUserMessageAsync(Guid userId, string userMessage, CancellationToken cancellationToken)
    {
        var history = new List<GeminiMessage> { GeminiMessage.FromText(GeminiRole.User, userMessage) };
        var tools = toolRegistry.Declarations;

        for (var iteration = 0; iteration < MaxToolIterations; iteration++)
        {
            var turn = await geminiService.GenerateContentAsync(history, tools, SystemInstruction, cancellationToken);

            if (turn is GeminiTurn.Text text)
                return text.Content;

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
                }
                catch (Exception ex)
                {
                    result = new { error = $"Tool '{call.Name}' failed: {ex.Message}" };
                }

                history.Add(GeminiMessage.FromFunctionResponse(call.Name, result));
            }
        }

        return "I wasn't able to finish looking that up just now — could you try rephrasing your question?";
    }
}

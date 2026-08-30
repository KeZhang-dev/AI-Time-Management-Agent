namespace TimeTracker.Api.Services.AiTools;

/// <summary>Resolves tool names to implementations and exposes their provider-agnostic LLM function declarations.</summary>
public class AgentToolRegistry(IEnumerable<IAgentTool> tools)
{
    private readonly Dictionary<string, IAgentTool> _toolsByName =
        tools.ToDictionary(t => t.Name, StringComparer.Ordinal);

    public IAgentTool? Find(string name) => _toolsByName.GetValueOrDefault(name);

    public IReadOnlyList<LlmToolDeclaration> Declarations => _toolsByName.Values
        .Select(t => new LlmToolDeclaration(t.Name, t.Description, t.ParametersSchema))
        .ToList();
}

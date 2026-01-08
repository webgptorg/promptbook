# Promptbook vs N8N

N8N is a powerful extendable workflow automation tool that allows you to connect various apps and services through a visual node-based interface. It has recently added strong AI capabilities, allowing users to integrate LLMs into their automated workflows.

N8N excels at "connecting things" and visual orchestration, but its AI agents are often treated as just another node in a larger automation. Promptbook, conversely, treats the Agent as the primary entity, with its personality, rules, and knowledge defined in a portable, text-based format that can be used inside or outside of automation platforms.

## Side-by-Side Comparison

| Promptbook                                                                          | N8N                                                                    |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Text-Based Definitions**: Agents are defined in `.book` files (Git friendly).   | ✘ **Visual Canvas**: Workflows are primarily defined in a visual UI.   |
| ✔ **Focus on Agent Character**: Built-in support for `PERSONA` and `TEAM`.          | ✘ **Focus on Flow Logic**: AI is a component in a larger logic tree.   |
| ✔ **Model & Platform Agnostic**: Run agents anywhere via the Promptbook Engine.     | ✘ **Platform Dependent**: Agents are typically tied to the N8N instance. |
| ✔ **Enforceable Rules**: Native `RULE` commitment with multi-agent verification.   | ✘ **Manual Prompting**: Rules must be manually added to system prompts. |
| ✔ **Lightweight & Embeddable**: Easy to integrate into existing applications.      | ✘ **Infrastructure Heavy**: Requires a full N8N instance to run.       |
| 💡 **Agent Personality**: Defined through natural language commitments.            | 💡 **Visual Orchestration**: Excellent for mapping out complex logic.  |

**Best for:** Developers building independent, reliable AI agents that need to maintain a consistent character across multiple platforms. | **Best for:** Automating complex workflows between hundreds of apps where AI is used to process or route data.

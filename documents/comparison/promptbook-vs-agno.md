# Promptbook vs Agno

Agno (formerly known as Phidata) is a lightweight framework for building AI agents with memory, knowledge, and tools. It focuses on making agents "portable" and easy to integrate into any Python application, with a strong emphasis on structured output and tool calling.

While Agno is an excellent developer tool for Python-centric environments, Promptbook takes the concept of "portability" further by creating a dedicated, model-agnostic language (Book) and a federated server ecosystem (Promptbook Server) that allows agents to exist and interact across different languages and platforms.

## Side-by-Side Comparison

| Promptbook                                                                          | Agno                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Book Language**: A standalone, declarative language for AI agents.             | ✘ **Code-Based**: Agents are defined primarily in Python code.         |
| ✔ **Federated Ecosystem**: Run and connect agents across multiple servers.           | ✘ **Library-Centric**: Focused on being a library within a single app.  |
| ✔ **Commitment System**: Explicit `PERSONA`, `KNOWLEDGE`, and `RULE` definitions.   | ✘ **Class-Based**: Logic is defined through class parameters and methods. |
| ✔ **Adversary Enforcement**: Multi-agent verification of rules and safety.          | ✘ **Direct Prompting**: Safety relies on the model following the prompt. |
| ✔ **Web UI & Server Included**: Built-in server and playground for agent management. | ✘ **Headless**: Developers must build their own UI or use third-party tools. |
| 💡 **Agent "Being"**: Focuses on the identity and commitments of the agent.        | 💡 **Tool Integration**: Exceptional support for function calling and tools. |

**Best for:** Building standardized, reliable, and federated AI agents that can be shared and run across different environments. | **Best for:** Python developers who need a robust, lightweight library to add agentic capabilities to their existing applications.

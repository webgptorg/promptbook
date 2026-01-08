# Promptbook vs ChatGPT-Assistance

ChatGPT-Assistance (referring to OpenAI's Assistant API and Custom GPTs) allows users to build custom versions of ChatGPT that combine instructions, extra knowledge, and any combination of skills. It is designed for developers and power users who want to create specialized AI experiences within the OpenAI ecosystem.

While ChatGPT-Assistance provides more control than the standard chat interface, it remains heavily dependent on OpenAI's proprietary infrastructure and lacks the explicit, portable "commitment" system that Promptbook uses to ensure agent reliability across different environments.

## Side-by-Side Comparison

| Promptbook                                                                          | ChatGPT-Assistance                                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Open Source & Portable**: Agents can be self-hosted or run on any server.       | ✘ **Proprietary & Locked**: Hosted exclusively on OpenAI's platform.   |
| ✔ **Explicit Commitments**: Rules and Personas are verified by the engine.         | ✘ **Implicit Instructions**: Instructions are treated as suggestions.  |
| ✔ **Version Control Friendly**: `.book` files are text-based and easy to track.     | ✘ **Dashboard Driven**: Configuration is often hidden in a web UI.     |
| ✔ **Adversary Enforcement**: Uses multiple agents to enforce `RULE` commitments.    | ✘ **Single Model Loop**: Relies on the model following its own prompt. |
| ✔ **Collaborative Agents**: `TEAM` commitment for multi-agent simulation.           | ✘ **Isolated Instances**: Agents don't naturally work in "teams".       |
| 💡 **Reliability focus**: Built for mission-critical specialized tasks.            | 💡 **Convenience focus**: Quick to set up for simple custom tasks.    |

**Best for:** Developers building enterprise-grade, multi-model AI agents with strict auditability and portability. | **Best for:** Rapidly prototyping custom GPTs or simple automated assistants within the OpenAI ecosystem.

# Promptbook vs OpenAI GPTs assistants

> ⚠ TODO: This document was written by AI Agent and needs to be proofread; Read is with a grain of salt

ChatGPT-Assistance (referring to OpenAI's Assistant API and Custom GPTs) allows users to build custom versions of ChatGPT that combine instructions, extra knowledge, and any combination of skills (tools). It is designed for developers and power users who want to create specialized AI experiences within the OpenAI ecosystem.

While ChatGPT-Assistance provides more control than the standard chat interface, it remains a "walled garden" heavily dependent on OpenAI's proprietary infrastructure. It lacks the explicit, portable **Commitment** system that Promptbook uses to ensure agent reliability and character consistency across different model providers and environments. Furthermore, ChatGPT-Assistance often struggles with "forgetting" instructions in long threads, a problem Promptbook mitigates through specialized **Adversary Verification** and structured context management.

## Side-by-Side Comparison

| Promptbook                                                                        | ChatGPT-Assistance                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Open Source & Portable**: Agents can be self-hosted or run on any server.     | ✘ **Proprietary & Locked**: Hosted exclusively on OpenAI's platform.   |
| ✔ **Explicit Commitments**: Rules and Personas are verified by the engine.        | ✘ **Implicit Instructions**: Instructions are treated as suggestions.  |
| ✔ **Version Control Friendly**: `.book` files are text-based and easy to track.   | ✘ **Dashboard Driven**: Configuration is often hidden in a web UI.     |
| ✔ **Adversary Enforcement**: Uses multiple agents to enforce `RULE` commitments.  | ✘ **Single Model Loop**: Relies on the model following its own prompt. |
| ✔ **Collaborative Agents**: `TEAM` commitment for multi-agent simulation.         | ✘ **Isolated Instances**: Agents don't naturally work in "teams".      |
| ✔ **Multi-Model Capability**: Use any model (OpenAI, Claude, Llama, etc.).        | ✘ **Vendor Locked**: Limited to OpenAI models only.                    |
| ✔ **Federated Interaction**: Connect agents across different domains and servers. | ✘ **Centralized**: Interaction is within the OpenAI ecosystem.         |
| 💡 **Reliability focus**: Built for mission-critical specialized tasks.           | 💡 **Convenience focus**: Quick to set up for simple custom tasks.     |

**Best for:** Developers building enterprise-grade, multi-model AI agents with strict auditability, rule enforcement, and cross-platform portability. | **Best for:** Rapidly prototyping custom GPTs or simple automated assistants within the OpenAI ecosystem for internal or light-duty use.

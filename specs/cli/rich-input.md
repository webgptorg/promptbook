# Rich terminal composer

[Main specification](../_main.md) · [CLI interaction](interactive-ui.md)

Use one coherent high-quality composer for interactive project intent, task descriptions, planning and open-ended chat messages/answers. Support multiline text and mixed text/image/file input. Preserve comfortable editing, visible focus, keyboard operation and supported pointer interaction without allowing pasted newlines to submit the form.

Represent long pasted text as compact, distinguishable tokens such as `[Pasted text #1, 120 lines]`, showing a useful length. Represent images and other attachments with their kind and identity, for example `[Image #2]` or `[File: brief.md]`. Tokens stand at their insertion positions and refer to the complete payload; they are not summaries. Several pastes and attachments can coexist with surrounding typed text without losing order or association.

Allow inspecting/expanding, editing text and removing individual inserted items before submission. Preserve payloads and drafts across resize, log updates, validation and wizard navigation. Reject unsupported or oversized input explicitly without silently truncating, losing an image or submitting partial content. No model call is needed to compose or retain the input.

Support image paste where the platform/terminal exposes it, with discoverable file attachment/path selection as a fallback. Do not pretend clipboard access exists on unsupported terminals or remote hosts. Plain/noninteractive input accepts equivalent text and explicit file references without depending on interactive clipboard state.

Collapsed display must never become persisted content. [Initialization](initialization.md) expands full text into `specs/_initial.md`, copies accepted attachments into the project and emits relative links. Other authoring workflows preserve equivalent payloads in their own source context. Accepted chat messages expand their full text/attachments into the selected `chats/*.book` document and a separate Git commit by default, not only a transient runtime request. Do not lose drafts or commit merely on entering the chat view. Do not replace readable source with a proprietary composer dump.

Design references reviewed for this contract are the official [Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli), [Claude Code terminal configuration](https://code.claude.com/docs/en/terminal-config) and [Claude Code interactive mode](https://code.claude.com/docs/en/interactive-mode). Reuse the interaction principles, not provider-specific shortcuts, exact collapse thresholds or internal cache layouts.

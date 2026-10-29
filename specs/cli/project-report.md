# Chatter's project brief

[Chatter](../agents/core-agents/chatter.md) · [Presentation](project-report-ui.md) · [Chats](chats.md) · [Book viewer](book-viewer.md)

## One shared append-only report

Chatter is the project's **spokesperson**: the normal conversational gateway and brief author, not the manager of other agents. No Reporter role or privileged reporting worker is added. Its ordinary editable instructions, OPEN/Teacher learning and TEAM can improve vocabulary, priorities and usefulness for technical, accounting, publishing or other projects.

Store briefs in root **`report.book`**, a normal Chat Book declared **`CHAT Report`** with **`CHAT MEMBER @Chatter`** alone. This explicit exception uses a stable undated name and root location rather than conventional date-named `chats/` storage. It is a one-agent report feed, not self-consultation, a human thread, a task or a fourth Book kind.

Append each brief as a timestamped `CHAT MESSAGE @Chatter ...`. Preserve every previous brief in source order; never overwrite the last paragraph or rely on Git alone for history. No compaction/cleanup is required now, even with a very large Book. Save promptly and commit with ordinary scoped Chatter/chat persistence and Chat-Name/source provenance, independently of traces.

```book
CHAT Report
CHAT MEMBER @Chatter
CHAT MESSAGE @Chatter 2026-10-29T10:00:00+01:00
This week's posts are scheduled and yesterday's publication is verified. The next post is due tomorrow; nothing needs your attention.
CHAT MESSAGE @Chatter 2026-10-29T10:15:00+01:00
Publishing is on schedule. A temporary provider outage is awaiting its announced reset while other work continues. No action is needed from you.
```

The effective brief is the **last complete Chatter report message**, parsed through the common Book model. Do not show Book commitments or replace a good brief with an incomplete streamed append. Missing/malformed/not-yet-generated reports are honest unavailable states with ordinary diagnostics/repair, not fabricated text or silent overwrite of a different Book. Generation uses ordinary Chatter task context, without manufacturing a first User message. Appending a brief alone creates no waiting-for-user chat/attention.

## Generation independent of viewers

Write one short paragraph, normally two to four concise sentences: meaningful overall situation, important results/current work, next expected step and whether useful human action is needed. Explain the project meaning of technical waits instead of merely echoing idle/counters/errors. Adapt content to the project, preserve material blockers and never invent progress or routine human requests.

Ordinary recurring Chatter work generates at a bounded persisted cadence; important results/direction changes and blocker appearance/resolution can bring it forward. Exact interval/debounce is an implementation choice. Coalesce overlapping timer/event/manual requests into one applicable generation. Use ordinary capacity, tools, ownership, retries, usage and Git; no independent scheduler or paid busy loop. Missing resources remain an honest wait.

Opening/closing/refreshing a dashboard and running status trigger **no generation, provider call or file mutation**. The engine maintains briefs with zero viewers and five clients read the same saved brief. Explicit Refresh report requests shared generation and updates all clients on save; retain the prior brief while pending. Respect pause: automatic/queued refresh waits for background scheduling rather than secretly resuming Chatter. Explicit conversation remains separately available.

## Discuss a displayed snapshot

Discuss report creates a **new ordinary chat in `chats/`** with normal generated name and User/Chatter membership. Its first persisted Chatter message contains the displayed brief's exact text, with original report timestamp/source provenance. It is a fixed snapshot even when another brief arrives. Let User respond; make no model call merely to repeat the report.

Do not reopen the latest Chatter thread, copy the whole report history or append User replies to `report.book`. First-User-message MODEL routing happens normally before the first newly generated reply. Separate discussions are distinct threads; existing threads can be reopened explicitly.

## Acceptance outcomes

Generate with zero viewers, then open several dashboards/status: all read the same last complete parsed message without generation. Append on cadence/event/explicit refresh and update all clients; preserve earlier messages and scoped commits. A partial append cannot hide the last good brief. Respect pause/capacity and show missing resources honestly.

Discuss an old displayed brief, then generate another: the new normal chat retains the exact earlier Chatter snapshot. Verify learning/customized content and a very long report Book through the shared viewer/editor core.

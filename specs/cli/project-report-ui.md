# Project brief in dashboard and status

[Report](project-report.md) · [Dashboard layout](dashboard-layout.md) · [Shared status](status-view.md)

Show a prominent full-width brief immediately beneath Promptbook/PTBK and project identity, above the home grid. Render only the last complete parsed Chatter message from `report.book`, as a concise paragraph with its original generation time/freshness. Do not show raw Book controls/old messages. Lifecycle and readiness facts come from the engine in their proper tiles, not inferred from old prose.

Reserve responsive height for identity plus brief and reduce secondary tile whitespace/copy before requiring ordinary scrolling. The operator should understand the important project situation without entering every tile. Keep full text available through the shared viewer when a very narrow surface needs truncation; never hide a material request behind unlabeled clipping. Missing/stale/pending-generation state is truthful and the last saved brief stays readable.

Expose discoverable **Discuss report** and **Refresh report** keyboard actions with browser equivalents. Two-key sequences are acceptable without lifecycle-key collisions; never capture composer/editor input. Discussion creates a new snapshot-seeded chat. Refresh is an explicit shared generation request, coalesced and subject to pause/capacity, never a result of opening the view. Every viewer observes the same saved result while retaining local focus/drafts.

`ptbk status` and its shared `show` alias print the **same saved brief** prominently, once, and exit with useful truthful snapshot diagnostics. Do not wait for Chatter or require a running service/harness to read the saved Book. Raw/structured output retains text, original generation time and actual availability/persistence state. Missing data never starts an engine, generates reports or fabricates freshness. Older briefs remain readable through Files/Book viewing without changing which is current or answering a request.

## Acceptance outcomes

Normal/narrow/short/wide views show identity, useful brief and compact grid without ordinary scrolling. Multiple viewers share updates; status returns immediately with the same stored text, including offline/stopped service. Discuss creates a distinct chat; Refresh coalesces and cannot bypass pause. Reading makes no files, commits or provider calls.

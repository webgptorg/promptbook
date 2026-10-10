# Attempts, retries and provider limits

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Preserve the separation between check-feedback repairs and technical-failure retries. Check feedback is limited to three implementation/repair attempts for the same task; the technical retry loop in the current code has an initial attempt and at most three additional retries. These must not become unbounded or silently multiplied paid calls without explanation.

**New decision:** a central attempt budget and unified event/report must show both counters and the reason for each additional call. Provider recovery from a confirmed transient error preserves attempt identity; persistence, signing and push errors must never map to a model retry. If safe replay cannot be proven, the state is `recovery-required`.

Wait for quota according to the reset reported by the provider; if unavailable, use bounded backoff. Verify availability after resuming rather than promise a fixed reset inferred from text. Respect pause/cancel during long waits and do not make paid idle queries. A Codex credit request without `--allow-credits` must exit with instructions.

## Related specifications

- [Project checks and repairs](checks.md)
- [Coding harnesses](harnesses.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Operational quality](operations.md)

# Architecture and coding standards

[Main specification](../_main.md)

These are implementation constraints of the product specification, not a separate implementation or a claim that the current code already meets them. Keep functional behavior, shared domain rules and presentation distinct. Prefer small comprehensible contracts over duplicated special cases.

- [Naming and canonicalization](naming.md): JSON keys, booleans, user-defined identifiers and fixed enum values.
- [Shared logic and DRY](shared-logic.md): one implementation of domain operations behind initialization, CLI and dashboards.
- [Automatic repair](../concepts/automatic-repair.md): a first-class system principle, not an incidental detail of an agent implementation.

Changes to a shared contract must update its callers, documentation and acceptance scenarios together. Test observable behavior and failure recovery through every entry point; do not maintain competing definitions of the same rule in individual views.

# Shared domain logic and DRY

[Architecture and coding standards](_index.md) · [Shared controls](../cli/controls.md) · [Git persistence](../cli/git-persistence.md)

Follow **Don't Repeat Yourself** for behavior, not merely for duplicated text. Initialization, `ptbk tool` commands and dashboard management are three entry points to one tool-management capability. They must not independently implement tool creation, validation, modification, activation, removal, credential edits or commit rules.

## One typed contract

Use the same domain types, objects, validation rules and operations behind every entry point. In TypeScript, tool records form a typed discriminated contract: `type` selects BROWSER or HARNESS and `variant` selects the variant-specific configuration. Invalid combinations are not represented as unrelated bags of optional properties. Extending a variant must not require copying its business rules into three interfaces.

The shared operations own canonicalization, uniqueness and reference checks, defaults, last-enabled-tool confirmation, in-use checks, configuration persistence, non-destructive environment-file edits, operation-scoped Git commits and notification of the running engine. A client gathers input and displays the shared result; it does not independently manipulate configuration, secrets, browser processes or Git. Browser and harness adapters may have different internals behind this common external tool model.

Init calls these same operations in its bounded setup transaction, with simple generated names/defaults instead of exposing every advanced option. It may group setup writes in the setup commit; do not create an extra worker or a second tool implementation. CLI and dashboard use the same operations for later incremental changes. Different confirmation presentation is allowed, different domain semantics are not.

With a running engine, route changes through coordinated project ownership. Without a running engine, commands use the same domain implementation with safe project/file/Git coordination, not a weaker duplicate. A second terminal is an ordinary supported client, not permission to overwrite the active task or its index state. Recheck relevant revisions and in-use status at application time, not only when a dialog opens.

## One rich-input implementation

Initialization, chat and full-source Book editing **must implement rich input once**. Reuse the same editor/input model, Ctrl+V and macOS Command+V acquisition, long-text collapsing/expansion, image/document handling, project-asset storage and readable serialization. A shared visual style with three copied paste handlers does not satisfy DRY. Task descriptions, planning and other text fields reuse this same capability.

The entry point only configures interaction policy: chat/init Enter accepts/submits; Book-source Enter inserts a newline and Ctrl+S saves without exit. Saving behavior and content diagnostics are coordinated with shared authoring/repair operations. Tests of payload preservation and attachments should exercise that common behavior rather than conceal separate implementations. See [rich input](../cli/rich-input.md) for the single behavioral contract and [Book editor](../cli/book-editor.md) for its mode.

## Presentation and scheduling boundaries

Keep UI-specific focus, key bindings, formatting and transport separate from shared business decisions. Inspection, configuration changes, runtime diagnostics and lifecycle actions are distinct operations. Enabling/disabling a tool persists configuration; restarting a browser or force-stopping the engine does not implicitly delete that tool.

One operation owns its authorized changes and its commit. Shared persistence must support a tool commit during an unrelated active task without sweeping that task's files into the commit or reverting the tool change at task completion. Secret storage and runtime ownership are not versioned merely because their associated configuration is committed.

Use the same approach for configuration migrations, canonicalization, synchronization controls and automatic repair: one source of truth with thin entry points. Exact classes, module layouts and concurrency primitives remain implementation choices, but observable consistency, isolation and recovery are mandatory.

## Acceptance outcomes

Apply equivalent add/modify/enable/disable/remove operations through initialization where applicable, CLI and dashboard. Verify equivalent canonical records, diagnostics, confirmation requirements, secret retention and persistence. Race a dashboard edit with a second-terminal edit and with task completion: preserve all authorized changes, reject stale conflicting intent actionably, and never mix operation ownership. Test both a running and a stopped project without separate behavior implementations.

[Wallet](../cli/wallet.md) credential input, project encryption/key handling, login application and browser-pool operations also have one engine-owned implementation. Terminal/browser/API surfaces are controllers, not independent cryptography, credential stores or pool coordinators. Keep agent access behind the same secret boundary.

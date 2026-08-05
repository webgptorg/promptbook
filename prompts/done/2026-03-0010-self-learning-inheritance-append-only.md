[x] ~$1.24 an hour by OpenAI Codex `gpt-5.3-codex`

[🧠🧩] Fix self-learning to be inheritance-chain aware and append-only

-   Update the self-learning flow so that when an agent is inheriting from another agent (via default inheritance from Adam or an explicit `FROM` commitment), the teacher:
    -   sees only the parent chain sources during self-learning (teacher context includes parent chain sources)
    -   **does not materialize** the parent agent source into the child agent’s book
    -   ensures that after self-learning, the child agent book contains only changes to the child agent’s own source (parent sources remain represented only via the inheritance chain, not duplicated)
-   Change the self-learning mechanism so the teacher does not replace/rewrite the entire book on every learning run:
    -   teacher outputs only the **newly appended** content
    -   the system appends that output into the existing book (append-only semantics)
    -   avoid duplicating previously existing segments (idempotency expectation)
-   You are working with the [Agents Server](apps/agents-server)
-   Add/adjust persistence so the stored representation of the agent source after self-learning preserves the “append-only” contract and does not snapshot/expand inherited parent sources into the child’s stored book
    -   Verify existing database model behavior and adjust it if it currently causes parent source materialization
-   Add/adjust tests to cover both inheritance cases:
    -   default inheritance from Adam
    -   explicit from-commitment inheritance
    -   assert that after self-learning the parent chain sources are not duplicated/materialized into the child’s stored book content
-   Update the [changelog](changelog/_current-preversion.md)


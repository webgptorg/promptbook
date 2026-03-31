[ ]

[🧩🕒] Aggregate duplicate commitments in system message without hard-coded duplication

-   *(@@@@ Written by agent)*
-   You are working with the Promptbook Engine commitment expansion flow (commitments are parsed and converted into “agent model requirements”) and ensure that when multiple `use *` commitments exist in agent source (ex: `USE TIME`, `USE BROWSER`, `USE SEARCH ENGINE`) they don’t duplicate the hard-coded instruction blocks in the generated system message. 
-   Implement aggregation similar to the existing `PERSONA` commitment behavior: hard-coded parts should be included once per type, while “additional instructions” (the free text content after the commitment keyword) should be merged (deduplicated + concatenated in a predictable order). 
-   Keep tool availability / tool declarations DRY: if multiple commitments of the same `use *` type imply the same tool(s) / tool availability in the system message, include those tool/tool-availability fragments only once. 
-   Special rule for `use` commitments:
    -   If repeated commitment has no “additional instructions” content, emit the corresponding commitment hard-coded block only once.
    -   If repeated commitment has multiple different “additional instructions” contents, emit the hard-coded block once and include the additional instructions as a single combined section (keep stable ordering based on appearance in the agent source).
-   Verify that the commitment parsing pipeline remains commitment-by-commitment (don’t change the parser contract) but introduce a final aggregation step before composing the final system message / model requirements for `use` commitments. 
-   Update/extend unit tests to cover at least these cases:
    -   `USE TIME` appears twice with identical additional instructions => output contains time hard-coded block once, and additional instructions once.
    -   `USE TIME` appears twice with different additional instructions => output contains time hard-coded block once, and additional instructions combined.
    -   `USE BROWSER` appears twice => browser hard-coded + tool availability appear once.
    -   `USE BROWSER` + `USE SEARCH ENGINE` mixed in multiple occurrences => each aggregated independently.
-   Add a regression test for Persona-like behavior (multi `PERSONA` commitments) to ensure aggregation does not introduce duplication or reorder the combined additional instructions unexpectedly. 
-   Add at least one “golden snapshot” test asserting the generated system message diff does not include repeated hard-coded fragments for duplicated `use *` commitments.
-   If any specific file / function names for `USE TIME`, `USE BROWSER`, `PERSONA` commitments are unclear, use `@@@` as placeholder and implement based on the actual code during development.

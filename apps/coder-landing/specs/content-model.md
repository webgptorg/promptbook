# Content model

The page content is represented as typed static data in the Next.js source.

## Navigation item

-   `href`: in-page anchor.
-   `label`: short header label.

## Hero metric

-   `value`: short measurable capability.
-   `label`: plain explanation of the value.

## Walkthrough step

-   `label`: ordered command-stage label.
-   `title`: human-readable step name.
-   `description`: short explanation of why the command matters.
-   `code`: terminal block displayed exactly as authored.

## Workflow item

-   `icon`: visual icon for the workflow phase.
-   `title`: workflow phase label.
-   `description`: concise phase explanation.

## Feature item

-   `icon`: visual icon for the capability.
-   `title`: feature label.
-   `description`: grounded behavior from the CLI implementation.

## Harness item

-   `title`: runner integration name.
-   `description`: how the harness fits into `ptbk coder`.
-   `command`: CLI option snippet.

## FAQ item

-   `question`: developer question.
-   `answer`: direct answer with no marketing filler.

## Related specs

-   [Overview](./overview.md)
-   [Terminal walkthrough](./terminal-walkthrough.md)

<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# ☯ Separation of concerns

-   Author: [hejny](https://github.com/hejny)
-   Created at: 6/23/2024, 9:52:42 PM
-   Updated at: 6/25/2024, 1:16:41 PM
-   Category: Concepts
-   Discussion: #32

With Promptbook a spaghetti role of doing everything in one place, the problem is separated info multiple responsibilities:

-   **Prompt engineer**
    -   **Prompt Writer**, who simply writes the wording and rules of each prompt template (similar to a copywriter)
    -   **Prompt structurer** who breaks down advanced tasks into advanced pipelines, doesn't need a full programmer, but needs someone with structural thinking
-   **Programmer** who programs the application in which the promptbooks are used.
-   **Dev/LLM Ops** who integrates it together
-   **ML engineer** to train the model and set it up

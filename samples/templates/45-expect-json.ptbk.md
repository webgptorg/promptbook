# ✨ Sample: Parsing data to JSON

-   PTBK URL https://ptbk.example.com/samples/postprocessing-2.ptbk.md@v1
-   PTBK VERSION 1.0.0
-   INPUT  PARAMETER {sentence} Sentence to be processed

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->
```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the mermaid graph visually

flowchart LR
    subgraph Promptbook execution
        direction TB
        start[Start]
        input_params[Input Parameters] --> prompt_pipeline[Prompt Template Pipeline]
        prompt_pipeline --> output_params[Output Parameters]

        prompt_pipeline --> execution_tools[Execution Tools]
        execution_tools -.-> LLMs[Natural Execution Tools]
        execution_tools -.-> scripts[Script Execution Tools]
        execution_tools -.-> user_interface[User Interface Tools]
        execution_tools --> jokers[Jokers]
        execution_tools --> expectations[Expectations]

        LLMs --> external_models[External LLM Sources]
        scripts --> scripting_lang[Supported Scripting Languages]
        user_interface --> UI_methods[User Interface Methods]

        jokers --> joker_handling[Joker Handling]
        expectations --> expectation_validation[Expectation Validation]
        output_params --> postprocessing[Postprocessing Functions]
        postprocessing -->result[Execution Report]

        result --> completion[Execution Complete]
    end

    start --> input_params
    completion -->|Feedback & Iteration| start
```
<!--/Graph-->

## 💬 Question

-   MODEL VARIANT COMPLETION
-   MODEL NAME `gpt-3.5-turbo-instruct`
-   POSTPROCESSING `trimEndOfCodeBlock`
-   Expect JSON

```
Dark horse hopping over the fence.

\`\`\`json
{
  "subject": "horse",
  "action": "hopping",
  "object": "fence"
}
\`\`\`

---

{sentence}

\`\`\`json
```

-> {parsedSentence}

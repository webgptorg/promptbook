# ✨ Sample prompt

Show how to use a simple prompt with one parameter.

-   PTBK URL https://ptbk.example.com/samples/single.ptbk.md@v1
-   PTBK VERSION 1.0.0
-   INPUT  PARAMETER `{word}` Any single word

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

## 💬 Synonym

Synonym for word

```text
Write synonym for "{word}"
```

`-> {wordSynonym}`

<!--
TODO: [🧠] Figure out less simmilar word for "single", "simple" and "sample"
-->

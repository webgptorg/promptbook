# ✨ Sample prompt with comments

Show how to use a simple prompt with no parameters and comments that should be ignored.

-   PIPELINE URL https://promptbook.example.com/samples/comment.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   OUTPUT PARAMETER `{greeting}`

<!--Graph-->
<!-- ⚠️ WARNING: This section was auto-generated -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "✨ Sample prompt with comments"

      direction TB

      input((Input)):::input
      templatePrompt("💬 Prompt")

      templatePrompt--"{greeting}"-->output
      output((Output)):::output

      click templatePrompt href "#prompt" "💬 Prompt";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 💬 Prompt

```text
Hello
```

<!-- With comment which should be removed + trimmed-->

`-> {greeting}`

<!--

## 💬 Commented Prompt

```text
Hello
```

`-> {greeting}`

-->

# ✨ Sample: Parsing data to JSON

-   PTBK URL https://ptbk.example.com/samples/postprocessing-2.ptbk.md@v1
-   PTBK version 1.0.0
-   Input parameter {sentence} Sentence to be processed

## 💬 Question

-   MODEL VARIANT Completion
-   MODEL NAME `gpt-3.5-turbo-instruct`
-   Postprocessing `trimEndOfCodeBlock`
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

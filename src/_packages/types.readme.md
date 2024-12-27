This package is usefull when you want to explicitly define types in your code.

```typescript
import type { PipelineJson } from '@promptbook/types';
import { pipelineStringToJson } from '@promptbook/core';

const promptbook: PipelineJson = pipelineStringToJson(
    spaceTrim(`

        # ✨ Example prompt

        -   OUTPUT PARAMETER {greeting}


        ## 💬 Prompt

        \`\`\`text
        Hello
        \`\`\`

        -> {greeting}

    `),
);
```

_Note: `@promptbook/types` does not export brand-specific types like `OpenAiExecutionToolsOptions`, `ClaudeExecutionToolsOptions`, `LangchainExecutionToolsOptions`,... etc._

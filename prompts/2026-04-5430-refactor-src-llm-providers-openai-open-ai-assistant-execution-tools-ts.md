[x] ~$0.00 24 minutes by GitHub Copilot `gpt-5.4`

[🧹🔜] Refactor [`OpenAiAssistantExecutionTools.ts` file](src/llm-providers/openai/OpenAiAssistantExecutionTools.ts)

- The file contains logic that is too complex to follow comfortably.
- The file contains overly complex logic in `callChatModelStream` (66/40)
    - Break branching logic into smaller, focused helper functions.
    - Keep each function responsible for one clear step or decision.
- Purpose of this refactoring is to improve code maintainability and readability.
- Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.
- Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project coding standards.
- After the refactoring, ensure that (1) `npm run test-name-discrepancies` and (2) `npm run test-package-generation` are passing successfully.
    1. All the things you have moved to new files should correspond the thing in the file with the file name, for example `MyComponent.tsx` should export `MyComponent`.
    2. All the things you have moved to new files but are private things to the outside world should have `@private function of TheMainThing` JSDoc comment.
- Keep in mind DRY *(Do not repeat yourself)* and SOLID principles while refactoring.
- **Do not change the external behavior** of the code. Focus solely on improving the internal structure and organization of the code.
- Before you start refactoring, make sure to read the code carefully and understand its current structure and functionality. Do a analysis of the current functionality before you start.
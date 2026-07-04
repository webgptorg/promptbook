[x] ~$0.00 16 minutes by GitHub Copilot `gpt-5.4`

[🧹🕉] Refactor [`useAgentChatHistorySyncState.ts` file](apps/agents-server/src/app/agents/[agentName]/chat/useAgentChatHistorySyncState.ts)

- The file mixes multiple concerns and dense logic, making it harder to follow.
- The file defines too many responsibilities (35 in single file)
    - Keep in mind the Single Responsibility Principle (SRP)
    - Consider breaking it down into smaller, focused modules or components.
- The file contains too many functions (33/20)
    - Keep related responsibilities grouped behind small facades or focused modules.
    - Consider extracting private helpers or splitting independent concerns into dedicated files.
- The file contains overly complex logic in `useAgentChatHistorySyncState` (87/24)
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
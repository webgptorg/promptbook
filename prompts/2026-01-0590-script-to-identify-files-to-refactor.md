[x] ~$1.23

[✨🐮] Create a script that will go through the repository and detect the files which are too large. Put there some thresholds, for example 500 lines and go only through the source codes. For example TypeScript files, text files and so on allow to specify the VMK, but because exceptions, because for example spellcheck text files shouldn't be under the rules of maximal number of lines in the project. The purpose of the script is to identify the places which should be refactored, also detect more than four entities in the file. By entity, I mean for example function, class, type, interface and so on. And if there are more than four entities in the file, the file should also be flagged. All of these constants like 500 or four and so on should be in some file constants alongside this identifying script. You are not doing the refactoring itself, you are just marking the files which will be refactored after that in different process. You could create a script under the scripts folder in the repository and also register a script in terminals JSON invest code folder. When you flag or identify the files which should be refactored, create for each refactoring separate prompt and put it into the prompts directory and preserve the structure in which the prompts are placed there. Recycle to logic or make some obstruction to keep drive principle with the generate prompt script to not repeat the code. And for each flagged file there should be created one markdown file with one prompt. And there should be some template which says like refactor this file and blah blah blah. I will write it manually after this and note or be aware that you are not doing the refactoring itself. You are just doing script that will create prompts that will be then run by totally different process and these files with these prompts will be doing the refactoring work. You are only doing the preparation for this work.

---

[x] ~$0.88

[✨🐮] In [script `find-refactor-candidates.ts`](scripts/find-refactor-candidates/find-refactor-candidates.ts) implement a mechanism for marking prompts by unique emoji tags like `[✨🐮]` take it from `scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts`

-   Purpose of these emoji tags is to uniquely tag the prompt across the repository and across the commits.
-   The emojis in the generated prompts instead of `[???]` which is there now
-   Keep in mind the dry principle: make some common abstraction for generating these emojis which aren't used in the project.

---

[ ]

[✨🐮] In [script `find-refactor-candidates.ts`](scripts/find-refactor-candidates/find-refactor-candidates.ts) Ignore some paths and files:

-   Only scan source code files: `.ts`, `.tsx`, `.js`, `.jsx` BUT not markdown files `.md` or other text files because it doesn't make sense to refactor them in this context
-   Ignore `node_modules` folder
-   Ignore `.next` folder or any other `.` hidden folder
-   Ignore `packages/` folder

---

[ ]

[✨🐮] In [script `find-refactor-candidates.ts`](scripts/find-refactor-candidates/find-refactor-candidates.ts) enhance the generated messages

**Current (bad) prompt:**

```markdowm
Refactor `apps/_common/components/ResizablePanels/ResizablePanels.tsx`

-   Target file: `apps/_common/components/ResizablePanels/ResizablePanels.tsx`
-   Reasons: lines 573/500; entities 6/4
-   @@ Replace this line with refactor instructions. Do not refactor in this script.
```

**Good prompt:**

```markdowm
Refactor [`ResizablePanels.tsx` file](apps/_common/components/ResizablePanels/ResizablePanels.tsx)

-   @@
-   The file mixes multiple concerns making it hard to follow.
-   The file contains excessive lines of code (574 lines) which makes it difficult to maintain and understand.
-   Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.
-   Keep in mind that the purpose of this refactoring is to improve code maintainability and readability.
-   Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project's coding standards.
-   Keep in mind DRY (Don't Repeat Yourself) and SOLID principles while refactoring.
-   DO NOT change the external behavior of the code. Focus solely on improving the internal structure and organization of the code.
```

<- In the example was used just two @ not three @ to not trigger the unfinished prompt

---

[x]

[✨🐮] In [script `find-refactor-candidates.ts`](scripts/find-refactor-candidates/find-refactor-candidates.ts)


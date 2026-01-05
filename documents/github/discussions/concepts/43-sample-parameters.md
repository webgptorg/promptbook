            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🎭 Sample parameters

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/25/2024, 2:31:24 PM
            - Updated at: 6/25/2024, 3:03:33 PM
            - Category: Concepts
            - Discussion: #43

            Allow sample(s) to be written for each parameter in the pipeline. This would be very useful for multi-shot prompting and [anomaly detection](https://github.com/webgptorg/promptbook/discussions/40). Each sample must meet [expectations](https://github.com/webgptorg/promptbook/discussions/30). If not, it results in `PromptbookLogicError`.

            - Create a special syntax for this in `.ptbk.md`

            ## Sample

            > Following is the sample promptbook

            # ✨ Sample prompt with sample parameters

            Show how to use two consecutive prompts with one parameter each.

            -   PROMPTBOOK URL https://promptbook.example.com/samples/two.ptbk.md
            -   PROMPTBOOK VERSION 1.0.0
            -   INPUT  PARAMETER `{word}` Any single word
            -   SAMPLE OF `{word}` a cat
            -   SAMPLE OF `{word}` a dog
            -   OUTPUT PARAMETER `{sentenceWithTwoSynonyms}`


            ## 💬 Synonym

            Synonym for word

            ```text
            Write synonym for "{word}"
            ```


            - SAMPLE `{wordSynonym}` a feline


            `-> {wordSynonym}`

            ## 💬 Sentence

            Sentence with word and wordSynonym

            ```text
            Write sentence with "{word}" and "{wordSynonym}" in it
            ```


            - SAMPLE `{sentenceWithTwoSynonyms}`


            ```text
            A cat is feline with small hat.
            ```


            `-> {sentenceWithTwoSynonyms}`



            ## Comments

### Comment by hejny on 6/25/2024, 2:39:54 PM

## 🧪 What we tried

_(Describe our experience here)_

---

### Comment by hejny on 6/25/2024, 2:40:12 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

---

### Comment by hejny on 6/25/2024, 3:03:33 PM

Working on here https://github.com/webgptorg/promptbook/issues/44

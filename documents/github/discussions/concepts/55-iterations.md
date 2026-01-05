            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🤸‍♂️ Iterations

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/26/2024, 7:31:03 PM
            - Updated at: 6/26/2024, 7:44:56 PM
            - Category: Concepts
            - Discussion: #55

            Allow to iterate when there are multiple values (use `extractValues` from [formats](https://github.com/webgptorg/promptbook/discussions/36)).



            ## Usages

            1) Postprocess each subitem separately
            2) Sent each item to LLM or user
            3) Make N items from M


            ## (1) Syntax

            This is how syntax can look like

            ```markdown
            - FORMAT
            - EXPECT MAX 100 Words
            - EACH EXPECT MIN 2 Words
            ```

            ## (2) Syntax

            ```markdown
            TODO
            ```

            ## (3) Syntax

            ```markdown
            TODO
            ```

            ## Question

            - How to determine format
              - Take from `EXPECT` of resulting parameter (what about input parameters)
              - Explicit say which `FORMAT` we are doing `EACH`







            ## Comments

### Comment by hejny on 6/26/2024, 7:44:56 PM

## 🔎 Other existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

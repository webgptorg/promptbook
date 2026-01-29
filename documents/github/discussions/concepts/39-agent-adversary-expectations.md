            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 👮 Agent adversary expectations

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/23/2024, 11:10:32 PM
            - Updated at: 6/27/2024, 11:29:39 AM
            - Category: Concepts
            - Discussion: #39

            Check the result of LLM with LLM.

            ## Strategy how to do it

            1) Generate and check with same model and same prompt - compare results
            2) Generate and check using the same rules
            3) Try the same model with a different temperature
            4) Try the same model with a different system message or prompt.
            5) Try different models from the same supplier
            6) Try different models (GPT 🆚 Claude)
            7) Combine with anomaly detaction https://github.com/webgptorg/promptbook/discussions/40


            - Make some **syntax** in Promptbook to describe simple and advanced cases **in one prompt template**
            - Maybe use Personas https://github.com/webgptorg/promptbook/discussions/22 - two different Personas can be adversaries.
            - Can it be (human) language agnostic?



            ## Simple case




            ```markdown
            Write a poem about {topic}.

            ## Rules

            - {rules}
            ```

            `-> {poem}`


            ```markdown
            This is a poem about {topic}, did it follow the given rules?

            ## The poem

            > {poem}

            ## Rules

            - {rules}
            - Fill in percentage from 0% to 100% of how the rules are followed.
            ```



            ## Advanced case



            ```markdown
            Write a poem about {topic}

            ## Rules

            - {rules}
            ```


            `-> {poem1}`



            ```markdown
            Write a poem about {topic}

            ## Rules

            - Be creative
            - Rules
            ```


            `-> {poem2}`

            ```markdown
            Write a poem about {topic}

            ## Rules

            - Be precise
            - {rules}
            ```


            `-> {poem3}`


            ```markdown
            Pick a poem about {topic}

            ## Rules

            - Pick the best poem of given 3
            - {rules}

            ## Poem 1

            > {poem1}

            ## Poem 2

            > {poem2}

            ## Poem 3

            > {poem3}
            ```


            `-> {poem}`


            ## Comments

### Comment by hejny on 6/24/2024, 2:49:02 PM

## What we tried

_(Describe our experience here)_

---

### Comment by hejny on 6/24/2024, 2:59:02 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

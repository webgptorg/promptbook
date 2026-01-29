            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🔙 Expectation-aware generation

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/23/2024, 11:07:19 PM
            - Updated at: 9/20/2024, 2:18:25 PM
            - Category: Concepts
            - Discussion: #37

            |Language| models| generate| one| [token](https://platform.openai.com/tokenizer)| at| a| time|.|


            The official SDKs give or stream you the result as a whole by default. You can specify max number of tokens or/and JSON mode in OpenAI, but thats it.


            But if we can somehow control the flow and picking of the tokens one-by-one and return back on each wrong step, we can ensure result expectations https://github.com/webgptorg/promptbook/discussions/30 in a much more granular scale, kind of a "SuperJSON" mode.


            ## Counts

            For example

            ```text
            Generate 20-30 words long sentence:

            |______________________________________________________|
                                                ↑                  ↑
                                               Min                Max

            Now try 1:
            |----|---|------|-------|-------|----------|---|--|------------|-----|STOP|

            Now try 2:
            |--|----|------------|------|STOP|

            Now try 1:
            |----|-----|--------|--------|--------|--------|STOP|

            With expectation-aware generation:
            |-----|-----------|---------|--------|---|-----|-------|--
            |-----|-----------|---------|------------|--|--------|----------
            |-----|-----------|---------|------------|--|---|----|STOP|
            ```


            ## Formats

            - See more [📑 Formats](https://github.com/webgptorg/promptbook/discussions/36)
            - Fix invalid JSON
            - Partial format check (can this text result in valid JSON / XML / Whatrever), if so, continue, if not, return a token


            ## Format + Schema

            - Heal valid JSON with extra stuff not defined in structure (JSON schema)
            - Partial structure check (can JSON pass this schema), if yes, continue, if no, return a token back or heal



            ---

            See also [⏳ Just-in-time fine-tuning](https://github.com/webgptorg/promptbook/discussions/33)



            ## Comments

### Comment by hejny on 6/24/2024, 2:49:13 PM

## What we tried

_(Describe our experience here)_

---

### Comment by hejny on 6/24/2024, 2:59:23 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

---

### Comment by hejny on 6/25/2024, 11:11:29 AM

11:11

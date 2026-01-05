            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🤼 Personas

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/19/2024, 5:21:11 PM
            - Updated at: 9/1/2024, 12:12:31 PM
            - Category: Concepts
            - Discussion: #22

            Personas are an abstraction over many of the technical things you need to think about when working with large language models.

            - Choosing the right model (according to capabilities, (human) languages, privacy,...)
            - Set `temperature` and `top_t`
            - Writing a system message
            - When to continue with which chat
            - Adversary checking between personas https://github.com/webgptorg/promptbook/discussions/39
            - When person does not know, he/she can escalate to another (similar concept as Apple Intelligence)
            - Persona can be user itself (this can mitigate PROMPT DIALOGS or/and some async queue to manual process)
            - Persona can be one GPT assistant
            - Anomaly detection for each persona https://github.com/webgptorg/promptbook/discussions/40


            # Synatax


            ```
            - PERSON Joe, 33 years old, skilled Typescript programmer who uses technically advanced terms.
            ```

            Create a new one:

            ```
            - PERSON Jane, experienced copywriter who writes perfect copy in French and keeps private information in secret
            ```

            And then just refers to the same person and continues the chat with "him":

            ```
            - PERSON Joe
            ```

            But allow you to override any technical settings:

            ```
            - PERSON Jane
            - MODEL NAME `gpt-4o`
            ```



            ## Comments

### Comment by hejny on 6/24/2024, 2:59:41 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the summilar thing?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

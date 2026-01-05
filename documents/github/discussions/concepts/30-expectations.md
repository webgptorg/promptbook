            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🧪 Expectations

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/23/2024, 9:48:39 PM
            - Updated at: 10/24/2024, 1:06:34 PM
            - Category: Concepts
            - Discussion: #30

            Large language models often do not give you what you need, this is called **prompt drift**, which can ruin the entire [pipeline](https://github.com/webgptorg/promptbook/discussions/64) execution if the problem occurs at the beginning of the middle of the pipeline.

            **BUT** it is often very easy to find out and solve:


            ## Count expectations


            ```markdown
            - EXPECT MIN 5 Words
            - EXPECT MAX 25 Words
            - EXPECT MIN 15 Characters
            - EXPECT MAX 1000 Characters
            - EXPECT MIN 1 Sentence
            - EXPECT MAX 5 Paragraphs
            ```




            ## Format expectations

            ```markdown
            - EXPECT JSON
            ```

            ```markdown
            - EXPECT XML
            ```

            ```markdown
            - EXPECT VCARD
            ```


            ## Format with schema

            ```markdown
            - EXPECT JSON https://promptbook.studio/sample/schemas/contacts.schema.json
            ```


            This is not ready yet, check [📑 Formats](https://github.com/webgptorg/promptbook/discussions/36)

            ---

            See also [✂️ Postprocessing](https://github.com/webgptorg/promptbook/discussions/31) and for more advanced expectations check [👮 Agent adversary expectations](https://github.com/webgptorg/promptbook/discussions/39) and [🔙 Expectation-aware generation](https://github.com/webgptorg/promptbook/discussions/37)


            And in future we would maybe do [🔴 Anomaly detection](https://github.com/webgptorg/promptbook/discussions/40)

            ## Comments

### Comment by hejny on 6/24/2024, 2:59:34 PM

## 🔎 Other existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

---

### Comment by hejny on 6/26/2024, 6:35:21 PM

Should we allow async expectations check - for example checking if the domain is free?

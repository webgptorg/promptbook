            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # ➿ Recurrent pipelines

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/23/2024, 11:09:01 PM
            - Updated at: 6/27/2024, 11:30:00 AM
            - Category: Concepts
            - Discussion: #38

            Allow return and cycle


            - Now we only support trees (forests), but allow complete recurrent graphs
            - It can become Turing complete


            `BUT it brings some annoying complications.`

            - Cannot do simple static analysis
            - Parameters are no longer immutable
            - Infinite loop detection is hard / impossible



            ## Example graph

            ```mermaid
            %% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

            flowchart LR
              subgraph "🌍 Create website content"

                  direction TB

                  input((Input)):::input
                  templateSpecifyingTheAssigment(👤 Specifying the assigment)
                  input--"{rawAssigment}"-->templateSpecifyingTheAssigment
                  templateImprovingTheTitle(✨ Improving the title)
                  input--"{rawTitle}"-->templateImprovingTheTitle
                  templateSpecifyingTheAssigment--"{assigment}"-->templateImprovingTheTitle
                  templateWebsiteTitleApproval(👤 Website title approval)
                  templateImprovingTheTitle--"{enhancedTitle}"-->templateWebsiteTitleApproval
                  templateCunningSubtitle(🐰 Cunning subtitle)
                  templateWebsiteTitleApproval--"{title}"-->templateCunningSubtitle
                  templateSpecifyingTheAssigment--"{assigment}"-->templateCunningSubtitle
                  templateKeywordAnalysis(🚦 Keyword analysis)
                  templateWebsiteTitleApproval--"{title}"-->templateKeywordAnalysis
                  templateSpecifyingTheAssigment--"{assigment}"-->templateKeywordAnalysis
                  templateCombineTheBeginning(🔗 Combine the beginning)
                  templateWebsiteTitleApproval--"{title}"-->templateCombineTheBeginning
                  templateCunningSubtitle--"{claim}"-->templateCombineTheBeginning
                  templateWriteTheContent(🖋 Write the content)
                  templateWebsiteTitleApproval--"{title}"-->templateWriteTheContent
                  templateSpecifyingTheAssigment--"{assigment}"-->templateWriteTheContent
                  templateKeywordAnalysis--"{keywords}"-->templateWriteTheContent
                  templateCombineTheBeginning--"{contentBeginning}"-->templateWriteTheContent
                  templateCombineTheContent(🔗 Combine the content)
                  templateCombineTheContent--"{content}"-->templateSpecifyingTheAssigment
                  templateCombineTheBeginning--"{contentBeginning}"-->templateCombineTheContent
                  templateWriteTheContent--"{contentBody}"-->templateCombineTheContent

                  templateCombineTheContent--"{content}"-->output
                  output((Output)):::output

                  classDef input color: grey;
                  classDef output color: grey;

              end;
            ```

            ## Comments

### Comment by hejny on 6/24/2024, 2:59:12 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

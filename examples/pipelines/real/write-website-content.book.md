# 🌍 Create website content

Instructions for creating web page content.

-   PIPELINE URL https://promptbook.studio/webgpt/write-website-content.book.md
-   INPUT  PARAM `{rawTitle}` Automatically suggested a site name or empty text
-   INPUT  PARAM `{rawAssigment}` Automatically generated site entry from image recognition
-   OUTPUT PARAM `{websiteContent}` Web content

<!--Graph-->
<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

```mermaid
%% 🔮 Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually

flowchart LR
  subgraph "🌍 Create website content"

      direction TB

      input((Input)):::input
      taskSpecifyingTheAssigment("👤 Specifying the assigment")
      input--"{rawAssigment}"-->taskSpecifyingTheAssigment
      taskImprovingTheTitle("✨ Improving the title")
      input--"{rawTitle}"-->taskImprovingTheTitle
      taskSpecifyingTheAssigment--"{assigment}"-->taskImprovingTheTitle
      taskWebsiteTitleApproval("👤 Website title approval")
      taskImprovingTheTitle--"{enhancedTitle}"-->taskWebsiteTitleApproval
      taskCunningSubtitle("🐰 Cunning subtitle")
      taskWebsiteTitleApproval--"{title}"-->taskCunningSubtitle
      taskSpecifyingTheAssigment--"{assigment}"-->taskCunningSubtitle
      taskKeywordAnalysis("🚦 Keyword analysis")
      taskWebsiteTitleApproval--"{title}"-->taskKeywordAnalysis
      taskSpecifyingTheAssigment--"{assigment}"-->taskKeywordAnalysis
      taskCombineTheBeginning("🔗 Combine the beginning")
      taskWebsiteTitleApproval--"{title}"-->taskCombineTheBeginning
      taskCunningSubtitle--"{claim}"-->taskCombineTheBeginning
      taskWriteTheContent("🖋 Write the content")
      taskWebsiteTitleApproval--"{title}"-->taskWriteTheContent
      taskSpecifyingTheAssigment--"{assigment}"-->taskWriteTheContent
      taskKeywordAnalysis--"{keywords}"-->taskWriteTheContent
      taskCombineTheBeginning--"{contentBeginning}"-->taskWriteTheContent
      taskCombineTheContent("🔗 Combine the content")
      taskCombineTheBeginning--"{contentBeginning}"-->taskCombineTheContent
      taskWriteTheContent--"{contentBody}"-->taskCombineTheContent

      taskCombineTheContent--"{websiteContent}"-->output
      output((Output)):::output

      click taskSpecifyingTheAssigment href "#specifying-the-assigment" "👤 Specifying the assigment";
      click taskImprovingTheTitle href "#improving-the-title" "✨ Improving the title";
      click taskWebsiteTitleApproval href "#website-title-approval" "👤 Website title approval";
      click taskCunningSubtitle href "#cunning-subtitle" "🐰 Cunning subtitle";
      click taskKeywordAnalysis href "#keyword-analysis" "🚦 Keyword analysis";
      click taskCombineTheBeginning href "#combine-the-beginning" "🔗 Combine the beginning";
      click taskWriteTheContent href "#write-the-content" "🖋 Write the content";
      click taskCombineTheContent href "#combine-the-content" "🔗 Combine the content";

      classDef input color: grey;
      classDef output color: grey;

  end;
```

<!--/Graph-->

## 👤 Specifying the assigment

What is your web about?

-   DIALOG TEMPLATE

```
{rawAssigment}
```

`-> {assigment}` Website assignment and specification

## ✨ Improving the title

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4`
-   POSTPROCESSING `unwrapResult`

```
As an experienced marketing specialist, you have been entrusted with improving the name of your client's business.

A suggested name from a client:
"{rawTitle}"

Assignment from customer:

> {assigment}

## Instructions:

-   Write only one name suggestion
-   The name will be used on the website, business cards, visuals, etc.
```

`-> {enhancedTitle}` Enhanced title

## 👤 Website title approval

Is the title for your website okay?

-   DIALOG TEMPLATE

```
{enhancedTitle}
```

`-> {title}` Title for the website

## 🐰 Cunning subtitle

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4`
-   POSTPROCESSING `unwrapResult`

```
As an experienced copywriter, you have been entrusted with creating a claim for the "{title}" web page.

A website assignment from a customer:

> {assigment}

## Instructions:

-   Write only one name suggestion
-   Claim will be used on website, business cards, visuals, etc.
-   Claim should be punchy, funny, original
```

`-> {claim}` Claim for the web

## 🚦 Keyword analysis

-   MODEL VARIANT Chat
-   MODEL NAME `gpt-4`

```
As an experienced SEO specialist, you have been entrusted with creating keywords for the website "{title}".

Website assignment from the customer:

> {assigment}

## Instructions:

-   Write a list of keywords
-   Keywords are in basic form

## Example:

-   Ice cream
-   Olomouc
-   Quality
-   Family
-   Tradition
-   Italy
-   Craft

```

`-> {keywords}` Keywords

## 🔗 Combine the beginning

-   SIMPLE TEMPLATE

```

# {title}

> {claim}

```

`-> {contentBeginning}` Beginning of web content

## 🖋 Write the content

-   MODEL VARIANT Completion
-   MODEL NAME `gpt-3.5-turbo-instruct`

```
As an experienced copywriter and web designer, you have been entrusted with creating text for a new website {title}.

A website assignment from a customer:

> {assigment}

## Instructions:

-   Text formatting is in Markdown
-   Be concise and to the point
-   Use keywords, but they should be naturally in the text
-   This is the complete content of the page, so don't forget all the important information and elements the page should contain
-   Use headings, bullets, text formatting

## Keywords:

{keywords}

## Web Content:

{contentBeginning}
```

`-> {contentBody}` Middle of the web content

## 🔗 Combine the content

-   SIMPLE TEMPLATE

```markdown
{contentBeginning}

{contentBody}
```

`-> {websiteContent}`

# 🌍 Create website content

Instructions for creating web page content.

-   PTBK URL https://ptbk.webgpt.com/en/write-website-content.ptbk.md@v0.1.0
-   PTBK VERSION 0.0.1
-   INPUT  PARAM `{rawTitle}` Automatically suggested a site name or empty text
-   INPUT  PARAM `{rawAssigment}` Automatically generated site entry from image recognition
-   OUTPUT PARAM `{content}` Web content

## 👤 Specifying the assigment

What is your web about?

-   PROMPT DIALOG

```
{rawAssigment}
```

`-> {assigment}` Website assignment and specification

## ✨ Improving the title

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

-   PROMPT DIALOG

```
{enhancedTitle}
```

`-> {title}` Title for the website

## 🐰 Cunning subtitle

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

-   MODEL VARIANT COMPLETION
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

`-> {content}`

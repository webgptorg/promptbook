# 💭 Advanced Chatbot

Show how to define chatbot in advanced and low-level controlled way.

-   URL https://github.com/webgptorg/book/blob/main/books/templates/advanced-chatbot.book.md
-   KNOWLEDGE https://ptbk.io
-   KNOWLEDGE https://pavolhejny.com
-   FORMFACTOR Chat
-   INPUT PARAMETER `{previousTitle}` Previous title of the conversation
-   INPUT PARAMETER `{previousConversationSummary}` Previous conversation summary
-   INPUT PARAMETER `{userMessage}` User message
-   OUTPUT PARAMETER `{title}` Title of the conversation
-   OUTPUT PARAMETER `{conversationSummary}` Summary of the conversation
-   OUTPUT PARAMETER `{chatbotResponse}` Chatbot response

## Initial message

-   EXAMPLE

```
Hello, I am a Pavol`s virtual avatar. How can I help you?
```

`-> {chatbotResponse}`

## Knowledge

-   KNOWLEDGE

```
Pavol Hejný is a software engineer and creator of Promptbook.
```

## Create an answer

-   PERSONA Paul, a developer of the Promptbook Project

```markdown
Write a response to the user message:

**Question from user**

> {userMessage}

**Previous conversation**

> {previousConversationSummary}
```

`-> {chatbotResponse}`

## Summarize the conversation

-   PERSONA Paul
-   EXPECT MIN 1 Word
-   EXPECT MAX 10 Words

```markdown
Summarize the conversation in a few words:

## Rules

-   Summarise the text of the conversation in a few words
-   Convert the text to its basic idea
-   Imagine you are writing the headline or subject line of an email
-   Respond with a few words of summary only

## Conversation

**User:**

> {userMessage}

**You:**

> {chatbotResponse}
```

`-> {conversationSummary}`

## Title

-   SIMPLE TEMPLATE

> {conversationSummary}

`-> {title}`

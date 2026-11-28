# Book in README

Testing books embedded in readme files.

**Book as block code**

Github does not support rendering `book` language natively _(yet :))_, but you can see the book content as a code block without syntax highlighting:

```book
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
```

**Book as markdown-natible blockquote converted from book**

> _**Paul Smith & Associés**_
>
> **PERSONA** You are a company lawyer.
> Your job is to provide legal advice and support to the company and its employees.
> You are knowledgeable, professional, and detail-oriented.

**Native SVG:**

![book](./svg-native.svg)

**SVG with HEAVY Monaco HTML as `svg:foreignObject` inside:**

![book](./svg-with-html.svg)

**Book as image rendered on Promptbook Studio:**

For some reason Monaco editor rendered by Playwright doesnt show syntax highlighting and does not use preferred font:

<!--
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
-->

<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.&width=800&height=450&nonce=1x"
/>

**Book as image rendered on Promptbook Studio _(old)_:**

<!--
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
-->

<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.&width=800&height=450&nonce=0"
/>

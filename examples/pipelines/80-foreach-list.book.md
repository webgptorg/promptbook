# ✨ Write greeting for each customer

Show how to iterate over a list of customers and write a greeting for each.

-   PIPELINE URL https://promptbook.studio/examples/foreach-list.book.md
-   INPUT PARAMETER `{customers}` Customer names each customer on each row
-   OUTPUT PARAMETER `{greetings}` Greeting to each customer on each row

## Write a greeting

-   FOREACH Text Line `{customers}` -> `{customer}`
-   PERSONA Jane, customer service representative
<!--- TODO: Add EXPECT -->

```markdown
Write an email greeting for "{customer}"

## Rules

-   Write just a greeting, nothing else
```

`-> {greetings}`

### Examples of customers

-   EXAMPLE

```text
Paul
John
```

`-> {customers}`

### Examples of greetings

-   EXAMPLE

```text
Hello Paul
Hi John
```

`-> {greetings}`

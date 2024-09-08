# ✨ Write greeting for each customer

Show how to use a simple prompt with no parameters.

-   PIPELINE URL https://promptbook.studio/samples/foreach-list.ptbk.md
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

### Samples of customers

-   SAMPLE

```text
Paul
John
```

`-> {customers}`

### Samples of greetings

-   SAMPLE

```text
Hello Paul
Hi John
```

`-> {greetings}`

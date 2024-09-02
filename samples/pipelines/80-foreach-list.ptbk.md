# ✨ Write greeting for each customer

Show how to use a simple prompt with no parameters.

-   PIPELINE URL https://promptbook.studio/samples/foreach-list.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   INPUT PARAMETER `{customers}` Customer names each customer on each row
-   OUTPUT PARAMETER `{greetings}` Greeting to each customer on each row

## Write a greeting

<!--FOR EACH , FOREACH, EACH, FOR -->

-   EACH List Line -> `{customer}`
-   PERSONA Jane, [🍭] <!-- <- TODO: Allow to import persona-->
<!-- -   EXPECT [🍭] -->

```text
Write an email greeting for "{customers}"
```

<!--
TODO: [🍭] Change "{customers}" to "{customer}" after solving
> Can not resolve:
> - Parameter {greetings} which depends on {customer}
-->

`-> {greetings}`

### Samples of customers

-   SAMPLE

```text
Paul
John
```

`-> {greetings}`

### Samples of greetings

-   SAMPLE

```text
Hello Paul
Hi John
```

`-> {greetings}`

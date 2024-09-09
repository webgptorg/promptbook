# ✨ Write email for each customer

Show how to iterate over a table of customers and write an email for each.

-   PIPELINE URL https://promptbook.studio/samples/foreach-csv.ptbk.md
-   INPUT PARAMETER `{customers}` Customer names each customer on each row
-   OUTPUT PARAMETER `{emails}` Greeting to each customer on each row

## About eshop

-   KNOWLEDGE

```text
Coolstore is an eshop that sells various hobby, home and garden products. It has a wide range of products from garden gnomes to kitchen gadgets.
It has 3 physical stores in the UK and a large online store that operates in the UK + EU + Switzerland. Key benefits are fast delivery and excellent customer service with a personal touch.
```

## About UV LED Garden Gnomes

-   KNOWLEDGE

<!-- TODO: ALlow two ```blocks in KNOWLEDGE template -->

```text
Uranium Glass Garden Gnomes are the newest product in the eshop. They are made of glass with a fluorescent uranium oxide added to the glass mixture. The gnomes are equipped with a UV LED light that makes them glow in the dark. They are great for scaring away birds and snakes.
```

## Write a email

<!--
TODO: !!!!!! Allow and test:
-   FOREACH Csv row `{customers}` -> `{firstName},{lastName},{note}`
-->

-   FOREACH Csv row `{customers}` -> `{firstName}` `{lastName}` `{note}`
-   PERSONA Jane, customer service representative and skilled copywriter for eshop
<!--- TODO: Add EXPECT -->

```markdown
Write an email from Coolstore shop to customer "{firstName} {lastName}". Inform him about new product fluorescent Uranium Glass Garden Gnome with build-in UV LED light.

## Rules

-   Write just an text of email, nothing else
-   {note}
```

`-> {emails}`

### Samples of customers

-   SAMPLE

```csv
First name,Last name,Note
Alice,Springfield,Extremely important customer
John,Snow,More informally in Scottish English
Pavol,Hejný,"Writes in Czech language
Lives in and loves the Prague, please mention it every communication"
```

<!-- TODO: [🧩] Allow to import from 85-foreach.csv -->

`-> {customers}`

<!--

### Samples of emails

TODO: Write

-->

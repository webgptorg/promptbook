<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# ⭕ Parameters

-   Author: [hejny](https://github.com/hejny)
-   Created at: 8/11/2024, 5:55:23 PM
-   Updated at: 8/11/2024, 6:56:38 PM
-   Category: Concepts
-   Discussion: #83

Parameters that are placed in the prompt template and replaced to create the prompt.
It is a simple key-value object.

```json
{
    "animalName": "cat",
    "animalSound": "Meow!"
}
```

There are three types of template parameters, depending on how they are used in the promptbook:

-   **INPUT PARAMETER**s are required to execute the promptbook.
-   **Intermediate parameters** are used internally in the promptbook.
-   **OUTPUT PARAMETER**s are explicitelly marked and they are returned as the result of the promptbook execution.

_Note: Parameter can be both intermedite and output at the same time._

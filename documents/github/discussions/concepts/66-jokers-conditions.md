<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# 🃏 Jokers (conditions)

-   Author: [hejny](https://github.com/hejny)
-   Created at: 7/21/2024, 6:53:31 PM
-   Updated at: 8/11/2024, 6:05:53 PM
-   Category: Concepts
-   Discussion: #66

Joker is a previously defined parameter that is used to bypass some parts of the pipeline.
If the joker is present in the template, it is checked to see if it meets the requirements (without postprocessing), and if so, it is used instead of executing that prompt template. There can be multiple wildcards in a prompt template, if so they are checked in order and the first one that meets the requirements is used.

If none of the jokers meet the requirements, the prompt template is executed as usual.

This can be useful, for example, if you want to use some predefined data, or if you want to use some data from the user, but you are not sure if it is suitable form.

When using wildcards, you must have at least one minimum expectation. If you do not have a minimum expectation, the joker will always fulfil the expectation because it has none, so it makes no logical sense.

Look at [jokers.ptbk.md](https://github.com/webgptorg/promptbook/blob/main/samples/templates/41-jokers.ptbk.md) sample.

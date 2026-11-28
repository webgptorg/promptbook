            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # What should I do if I need the same promptbook in several human languages?

            - Author: [hejny](https://github.com/hejny)
            - Created at: 9/5/2024, 3:12:03 PM
            - Updated at: 11/29/2024, 3:09:22 PM
            - Category: FAQ
            - Discussion: #125

            What should I do if I need the same promptbook in several human languages?



            ## Comments

### Comment by hejny on 11/29/2024, 3:09:20 PM

A single promptbook can be written for several _(human)_ languages at the same time. However, we recommend that you have separate promptbooks for each language.

For large language models, you will get better results if you have prompts in the same language as the user input.

The best way to do this is to have suffixed promptbooks like `write-website-content.en.ptbk.md` and `write-website-content.cs.ptbk.md` for each supported language.

---

But this will change in the future:
https://github.com/webgptorg/promptbook/discussions/42

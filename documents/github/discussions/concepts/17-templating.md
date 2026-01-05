            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 📩 Templating

            - Author: [hejny](https://github.com/hejny)
            - Created at: 6/12/2024, 12:56:19 PM
            - Updated at: 6/24/2024, 3:39:21 PM
            - Category: Concepts
            - Discussion: #17

            The Promptbook templating system is super simple and bulletproof. On the other hand, it does not have the advanced features that other systems have.

            ## Simple example

            ```
            The {object} has a {subject}.
            ```

            ```
            The cat has a hat.
            ```


            ## Smart indentation template


            ```markdown
            Write the poem about {subject}:

            ## Rules

            Follow these rules

            1) {rules}


            ## Context

            This is some more helpful information

            - {context}

            ## Sample poem

            > {poemSample}
            ```

            ```markdown
            Write the poem about Promptbook:

            ## Rules

            Follow these rules

            1) Be creative
            2) Be technical
            3) It should be funny


            ## Context

            This is some more helpful information

            - Promptbook is a library for orchestrating large language models.
            - It is a great abstraction layer
            - Promptbook is like a recipe for manipulating natural text.
            - Promptbook is stored as a .ptbk.md file, which is a subset of markdown.
            - Multiple Promptbooks make a library.
            - There is a no-code platform for building promptbooks called Promptbook.studio

            ## Sample poem

            > In the land of tech where codes roam free,
            > Lies a library vast, a coder's jubilee.
            > Not filled with tomes or scrolls of old,
            > But Promptbooks shining, worth more than gold.
            >
            > Now Promptbook's no ordinary textual spree,
            > It's a recipe, my friend, for wizardry.
            > With wits and bytes it stirs the pot,
            > A .ptbk.md file—you know it's hot!
            >
            > Orchestrate models, large and grand,
            > Promptbook takes you by the hand.
            > With layers of abstraction, neat and prime,
            > It turns a dreadful chore into sublime.
            >
            > Need a sonnet or a quirky rhyme?
            > Promptbook's got your back each time.
            > "Manipulate natural text," they say—
            > With Promptbook, command and it will obey.
            >
            > Imagine models jamming like a band,
            > Conducted by your own smart hand.
            > Thanks to this great abstraction layer,
            > You won't need spells from dragon's lair.
            >
            > Now here’s where it gets too darn cool,
            > A no-code platform, anyone can rule!
            > Promptbook.studio, build with glee,
            > A Promptbook chef you’re soon to be.
            >
            > So here’s to Promptbooks, fun and bright,
            > Turning tech into sheer delight.
            > For coders, poets, and geeks alike...
            ```




            ---

            But maybe in the future we should include (besides the simple version) a real templating system with conditions, iterations, functions, dynamic variables, etc.

            ## Comments

### Comment by hejny on 6/12/2024, 12:56:35 PM

Inspiration:

https://langtail.com/docs/playground/templating

---

### Comment by hejny on 6/17/2024, 2:54:03 PM

Simple and advanced templating together

---

### Comment by hejny on 6/22/2024, 8:41:28 PM

https://github.com/webgptorg/promptbook/discussions/21

---

### Comment by hejny on 6/24/2024, 2:49:30 PM

## What we tried

_(Describe our experience here)_

---

### Comment by hejny on 6/24/2024, 2:59:38 PM

## 🔎 Existing solutions

_(Do some research / discussion)_

-   Has anyone else had the same problem?
-   Has a project come up with the solution
-   Is there a research paper about it?
-   Is there an article, video, podcast about it?
-   Is this even a good idea?

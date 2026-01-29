<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# Allow to pass lot of data as an input parameter

-   Author: [hejny](https://github.com/hejny)
-   Created at: 3/28/2025, 11:25:43 AM
-   Updated at: 3/28/2025, 11:44:55 AM
-   Labels: enhancement, .book, Project: Chutoo
-   Issue: #232

Following usecases should work:

Allow to pass huuuuuuuuuuuuuuuuuuuuuuuuge texts and to not be drown in the context:

```markdown
-   INPUT PARAMETER {scenario} Full scenario of the movie
-   OUTPUT PARAMETER {summary} Summary of given scenario of the movie

> Sumarize {scenario}
```

OR

```markdown
-   INPUT PARAMETER {scenario} Full scenario of the movie
-   OUTPUT PARAMETER {summary} Summary of given scenario of the movie

> Take {scenario} and sumarize it
```

Also it should do RAG above the parameters which are huge:

```markdown
-   INPUT PARAMETER {scenario} Full scenario of the movie
-   INPUT PARAMETER {question} Question about the movie from user
-   OUTPUT PARAMETER {answer} Answer to the user

> Answer {question} about {scenario}
```

This will already work in case `{scenario}` is `KNOWLEDGE` but it should also work with `PARAMETER`

---

Look at https://github.com/webgptorg/book/tree/main/pips/pip-0002-type-system

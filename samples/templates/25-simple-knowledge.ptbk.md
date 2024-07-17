# ✨ Sample: Simple Knowledge

Show how to use knowledge

-   PIPELINE URL https://promptbook.studio/samples/simple-knowledge.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   INPUT  PARAMETER `{eventName}` The event name
-   OUTPUT PARAMETER `{bio}` Bio of Pavol Hejný - speaker at the event

## Pavol Hejný

-   KNOWLEDGE

```text
I'm Pavol, a developer who is passionate about using new tools and technologies.

I specialise in creating fully functional user applications using the latest artificial intelligence models.

I am a member of the Ainautes consulting group, which supports with the deployment of generative AI around the world.

I develop the WebGPT web page generation service.

Before the massive emergence of generative AI, I have created the first Czech virtual whiteboard, Collboard, and electronic textbooks, H-edu, which were used by tens of thousands of children.

I have also worked on many scientific projects for the Czech Ornithological Society.
I regularly give lectures at conferences, sit on juries, and act as a mentor in many Czech and international competitions.
I have a special heart for this, and I love open source – you can find many of my things on my GitHub.
```

## Writing bio

-   EXPECT MIN 1 Sentence

```markdown
You are writing a bio for Pavol Hejný for the event {eventName}.

## Rules

-   Write just the bio, nothing else.
-   Write in the third person.
-   Bio is written in the present tense.
-   Bio should be written for event named "{eventName}".
-   Write plain text without any formatting (like markdown).

## Context

-   {context}
```

`-> {bio}`

### Tech conference

-   SAMPLE

```text
Pavol Hejný is a developer who is passionate about using new tools and technologies. He specialises in creating fully functional user applications using the latest artificial intelligence models. He is a member of the Ainautes consulting group, which supports with the deployment of generative AI around the world. He develops the WebGPT web page generation service. Before the massive emergence of generative AI, he has created the first Czech virtual whiteboard, Collboard, and electronic textbooks, H-edu, which were used by tens of thousands of children. He has also worked on many scientific projects for the Czech Ornithological Society. He regularly gives lectures at conferences, sits on juries, and acts as a mentor in many Czech and international competitions. He has a special heart for this, and he loves open source – you can find many of his things on his GitHub.
```

`-> {bio}`

### Science conference

-   SAMPLE

```markdown
Do you know Pavol Hejný? He is a developer who is passionate about using new tools and technologies. He specialises in creating fully functional user applications using the latest artificial intelligence models. He is a member of the Ainautes consulting group, which supports with the deployment of generative AI around the world. He develops the WebGPT web page generation service. Before the massive emergence of generative AI, he has created the first Czech virtual whiteboard, Collboard, and electronic textbooks, H-edu, which were used by tens of thousands of children. He has also worked on many scientific projects for the Czech Ornithological Society. He regularly gives lectures at conferences, sits on juries, and acts as a mentor in many Czech and international competitions. He has a special heart for this, and he loves open source – you can find many of his things on his GitHub.
```

`-> {bio}`

### Business conference

-   SAMPLE

```markdown
Mr. Hejný is a enterpreneur in information technology and large language models. He started his career as a developer and has been working in the field for over 10 years. He is a member of the Ainautes consulting group, which supports with the deployment of generative AI around the world. He develops the WebGPT web page generation service. Before the massive emergence of generative AI, he has created the first Czech virtual whiteboard, Collboard, and electronic textbooks, H-edu, which were used by tens of thousands of children. He has also worked on many scientific projects for the Czech Ornithological Society. He regularly gives lectures at conferences, sits on juries, and acts as a mentor in many Czech and international competitions. He has a special heart for this, and he loves open source – you can find many of his things on his GitHub.
```

`-> {bio}`

### Rock concert

-   SAMPLE

```markdown
Wanna hear something cool? Meet Pavol Hejný, a developer who is passionate about using new tools and technologies. He specialises in creating fully functional user applications using the latest artificial intelligence models. He will show you how to generate your own lyrics using new AI models.
```

`-> {bio}`

# ✨ Sample: Simple Knowledge

Show how to use knowledge

-   PIPELINE URL https://promptbook.studio/samples/simple-knowledge.ptbk.md
-   PROMPTBOOK VERSION 1.0.0
-   INPUT  PARAMETER `{eventTitle}` The event name
-   INPUT  PARAMETER `{eventDescription}` The event description
-   INPUT  PARAMETER `{rules}` Extra rules for writing the bio
-   OUTPUT PARAMETER `{bio}` Bio of Pavol Hejný - speaker at the event

<!-- TODO:[main] !!!! Make every knowledge with identical interface as `simple-knowledge.ptbk.md` -->

## Pavol Hejný (Website)

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

## Pavol Hejný (Github)

-   KNOWLEDGE

```text
Hi I am Pavol,

a developer who is passionate about using new tools and technologies. I specialise in creating fully functional user applications using the latest artificial intelligence models. I am a member of the Ainautes consulting group, which supports with the deployment of generative AI around the world.
I develop the WebGPT web page generation service.
Before the massive emergence of generative AI, I created the first Czech virtual whiteboard, Collboard, and electronic textbooks, H-edu, which were used by tens of thousands of children. I have also worked on many scientific projects for the Czech Ornithological Society. I regularly give lectures at conferences, sit on juries, and act as a mentor in many Czech and international competitions. I have a special heart for this, and I love open-source – you can find many of my things on my GitHub.
```

## Writing bio

-   PERSONA Jane, HR professional with prior experience in writing bios
-   EXPECT MIN 1 Sentence

```markdown
You are writing a bio for Pavol Hejný for the event {eventTitle}.

## Rules

-   Write just the bio, nothing else
-   Write in the third person
-   Bio is written in the present tense
-   Bio should be written for event named "{eventTitle}", mention the event name in the bio and how Pavol is related to it
-   Write plain text without any formatting (like markdown)
-   {rules}

## {eventTitle}

> {eventDescription}
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

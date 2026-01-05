<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# Where should I store my pipelines?

-   Author: [hejny](https://github.com/hejny)
-   Created at: 9/5/2024, 3:08:35 PM
-   Updated at: 9/5/2024, 3:09:00 PM
-   Category: FAQ
-   Discussion: #113

> TODO: Write

<!--

If you use raw SDKs, you just put prompts in the sourcecode, mixed in with typescript, javascript, python or whatever programming language you use.

If you use promptbooks, you can store them in several places, each with its own advantages and disadvantages:

1. As **source code**, typically git-committed. In this case you can use the versioning system and the promptbooks will be tightly coupled with the version of the application. You still get the power of promptbooks, as you separate the concerns of the prompt-engineer and the programmer.

2. As data in a **database** In this case, promptbooks are like posts / articles on the blog. They can be modified independently of the application. You don't need to redeploy the application to change the promptbooks. You can have multiple versions of promptbooks for each user. You can have a web interface for non-programmers to create and modify promptbooks. But you lose the versioning system and you still have to consider the interface between the promptbooks and the application _(= input and output parameters)_.

3. In a **configuration** in environment variables. This is a good way to store promptbooks if you have an application with multiple deployments and you want to have different but simple promptbooks for each deployment and you don't need to change them often.

-->

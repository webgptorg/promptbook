            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🔧 User Interface Tools

            - Author: [hejny](https://github.com/hejny)
            - Created at: 8/11/2024, 6:29:06 PM
            - Updated at: 8/11/2024, 6:47:03 PM
            - Category: Concepts
            - Discussion: #93

            `UserInterfaceTools` is an abstract container that represents all the tools needed to interact with the user. It is implemented by concrete execution tools:

            -   _(Not implemented yet)_ `ConsoleInterfaceTools` is a wrapper around `readline` module that interacts with the user via console.
            -   `SimplePromptInterfaceTools` is a wrapper around `window.prompt` synchronous function that interacts with the user via browser prompt. It is used for testing and mocking **NOT intended to use in the production** due to its synchronous nature.
            -   `CallbackInterfaceTools` delagates the user interaction to a async callback function. You need to provide your own implementation of this callback function and its bind to UI.


            https://github.com/webgptorg/promptbook/discussions/76

            <!-- <- TODO: Provide here a way how to do it with some our plugin -->

            ## Comments

### Comment by hejny on 8/11/2024, 6:47:03 PM

TODO: Write this better + link

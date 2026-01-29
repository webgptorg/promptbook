            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # 🗜  Script Execution Tools

            - Author: [hejny](https://github.com/hejny)
            - Created at: 8/11/2024, 6:29:02 PM
            - Updated at: 8/11/2024, 6:47:00 PM
            - Category: Concepts
            - Discussion: #92

            `ScriptExecutionTools` is an abstract container that represents all the tools needed to EXECUTE SCRIPTs. It is implemented by concrete execution tools:

            -   `JavascriptExecutionTools` is a wrapper around `vm2` module that executes javascript code in a sandbox.
            -   `JavascriptEvalExecutionTools` is wrapper around `eval` function that executes javascript. It is used for testing and mocking **NOT intended to use in the production** due to its unsafe nature, use `JavascriptExecutionTools` instead.
            -   _(Not implemented yet)_ `TypescriptExecutionTools` executes typescript code in a sandbox.
            -   _(Not implemented yet)_ `PythonExecutionTools` executes python code in a sandbox.

            There are [postprocessing functions](#postprocessing-functions) that can be used to postprocess the result.


            See more in https://github.com/webgptorg/promptbook/discussions/77

            ## Comments

### Comment by hejny on 8/11/2024, 6:47:00 PM

TODO: Write this better + link

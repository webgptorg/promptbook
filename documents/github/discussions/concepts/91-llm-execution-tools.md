            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # ⛏ LLM Execution Tools

            - Author: [hejny](https://github.com/hejny)
            - Created at: 8/11/2024, 6:28:58 PM
            - Updated at: 8/11/2024, 6:46:56 PM
            - Category: Concepts
            - Discussion: #91

            `LlmExecutionTools` is a container for all the tools needed to execute prompts to large language models like GPT-4.
            On its interface it exposes common methods for prompt execution.
            Internally it calls OpenAI, Azure, GPU, proxy, cache, logging,...

            `LlmExecutionTools` an abstract interface that is implemented by concrete execution tools:

            -   `OpenAiExecutionTools`
            -   `AnthropicClaudeExecutionTools`
            -   `AzureOpenAiExecutionTools`
            -   `LangtailExecutionTools`
            -   _(Not implemented yet)_ `BardExecutionTools`
            -   _(Not implemented yet)_ `LamaExecutionTools`
            -   _(Not implemented yet)_ `GpuExecutionTools`
            -   Special case are `RemoteLlmExecutionTools` that connect to a remote server and run one of the above execution tools on that server.
            -   Another special case is `MockedEchoLlmExecutionTools` that is used for testing and mocking.
            -   The another special case is `LogLlmExecutionToolsWrapper` that is technically also an execution tools but it is more proxy wrapper around other execution tools that logs all calls to execution tools.

            ## Comments

### Comment by hejny on 8/11/2024, 6:46:56 PM

TODO: Write this better + link

<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# 🏭 Compilation, parsing and preparing pipelines

-   Author: [hejny](https://github.com/hejny)
-   Created at: 1/11/2025, 3:27:09 PM
-   Updated at: 3/19/2025, 5:33:11 PM
-   Category: Concepts
-   Discussion: #196

There are 3 similar functions:

-   `compilePipeline` **(preferred)** - which properly compiles the promptbook and use embedding for external knowledge
-   `parsePipeline` - use only if you need to compile promptbook synchronously and it contains NO external knowledge
-   `preparePipeline` - just one step in the compilation process

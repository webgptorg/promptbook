[✨🎰] Update the information of models

The available models are listed in the folder `src/llm-providers`.
For example, the OpenAI models are listed in the file `src/llm-providers/openai/openai-models.ts`.

**Update all the models**

-   Find the latest information on official websites
-   Find new models and add them to the lists of available models.
-   Deprecate models that have been deprecated.
-   **Do not remove models** unless you are certain that they are no longer available.
-   Update the pricing of all models. _Often, the price of a model can lower over time, so check all listed models._
-   Make sure you have searched the models for API use, not the model available in app like ChatGPT.
    Put changes to prerelease in `CHANGELOG.md` in the section with the version from `package.json`.

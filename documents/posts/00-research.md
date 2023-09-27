How to efficiently organize and professionalize prompts in a large application?

I am working on a AI website generator that relies heavily on internal prompts and prompt pipelines. So far, I have been using a simple system of text/markdown files with {VARS}.

However, this simple solution is no longer sufficient and is becoming chaotic.

⏣

How to do this in the best possible way in terms of application design?

1. How to more effectively A/B test the performance of individual prompts and their versions
2. How to create prompt compilations/subtemplates?
3. Should the template contain parameters like temperature, top_t, model,... or should it be more abstract?
4. Alternatively, make some minimum requirements like "this prompt template requires at least GPT-3.5" and "LLaMA2 is sufficient for this".
5. What is the best way to do metapromting, i.e. improving templates with prompts?
6. Should the template be part of the project's source code? Logically it would make sense, since it's just a special kind of "source code". Or should it be stored in a database?
7. Have a prompt for each (human) language or have just english and translate the inputs/outputs?
8. Which format do you use for comments? <!-- or /\*?
9. Preprocessing: sometimes the user input still needs to be reformatted by the preprocessor or there can be some secutity issue like prompt injection.
10. How to do postprocessing: for zero-shot queries, GPT 3,5 and 4 return pretty good results, except that it often does the thing of wrapping the result in quotes or something like that, which can be removed fairly easily with RegExp. How are these patterns supposed to be stored and put into the context of prompt templates?
11. Fine-tuning, do we include that in this logic, or is fine-tuning abstracted below and semantically more of a version of the model?

⏣

I will be very happy for discussion, suggestions, proposals,... 🚀

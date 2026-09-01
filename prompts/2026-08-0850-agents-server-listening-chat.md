[-] Creating an easier solution with less complexity than this 

[✨🦚] Create an option to start a listening chat with the agents. 

-   Listening chat works in two stages:
    1. Listening - Gathering the audio context and extra text context
    2. Processing - Doing actions or creating answers based on this context 
- Listening chat cannot have many messages. It has only the listening phase and processing phase and the answer. 
- Primary source of the information of the listening chat is the audio input. 
- Secondary source of the information is additional context. This additional context can be passed via the GET parameter or edited before the chat is submitted in the text area. 
- Audio can be gathered either from the microphone or by uploading audio files. 
- You can record as many audio chunks as you want, or add as many audio files as you want, or mix them together. 
- There should be some information about how many chunks are recorded and how many minutes or hours the audio has before the chat is submitted. 
- Agent is not answering by his natural voice. The answering face of the listening chat Puts the information in the standard text form 
- Before the listening chat is submitted, the visual should be different from the standard chat. 
- When the chat is being processed and answered, it should be shown in the standard chat component. The only difference is that there will be only question and answer
- 
- Listening chat isn't the interactive conversation between the agent and the user or some live transcription. It is a completely different thing. 
-   After this change, there will be three types of the chats:
    -   normal chat
    -   goal chat
    -   listening chat
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

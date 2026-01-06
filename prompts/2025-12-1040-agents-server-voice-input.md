[x]

[✨🥤] In the chat implement the voice speech input

-   Do the voice inputting modularly, Do the `SpeechRecognition` type Implement two providers:
    -   `BrowserSpeechRecognition` that uses Web Speech API `SpeechRecognition` available in modern browsers
    -   `OpenAiSpeechRecognition` that uses OpenAI Whisper API to transcribe audio into text
-   Do the testing page with simple textarea and button to start/stop recording and show the transcribed text, put it in `/admin/voice-input-test` in the `Agents Server` application `/apps/agents-server` and add link to the menu under "System" > "Voice Input Test"
-   Allow to pass speech recognition provider into the `<Chat/>` component as a prop
-   The chat should show a microphone button alongside other buttons (like send button)
-   This button should start and stop the voice recording and show some nice UI indicator when recording is active
-   It should have great UX, e.g., disable the button when recording is active, show visual feedback, etc.
-   When the recording is stopped, the transcribed text should be inserted into the chat input
-   Transcription should happen in real-time as the user speaks, showing partial results if possible
-   The transcription should handle errors gracefully, e.g., show error message if transcription fails
-   Remove and cleanup code the old method of voice inputting in the `<Chat/>` component
-   In the `Agents Server` application `/apps/agents-server` look of OpenAI api key is presented in the environment variables, and automatically use `OpenAiSpeechRecognition` otherwise use `BrowserSpeechRecognition` in the chat
-   Notice that speech recognition is somewhat different then voice call, do not confuse these two concepts and do nothing with voice call here.
-   Do not implement the voice output (text-to-speech) here, this will be done separately.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥤] foo

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥤] foo

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥤] foo

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

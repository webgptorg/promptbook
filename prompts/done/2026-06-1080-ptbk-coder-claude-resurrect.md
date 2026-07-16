[x] ~$0.6688 2 hours by OpenAI Codex `gpt-5.5`

[✨🦩] Automatically resurrect the Claude code tasks

```
Používám `claude --allowedTools "Bash,Read,Edit,Write" --model claude-opus-4-8 --effort max --output-format stream-json --verbose --include-partial-messages --print <<'CLAUDE_PROMPT'` ale děje se mi nepříjemný problém, Current session dojde, ale prompt jeste neni hotovy, ten selze a musi se spustit znovu. Tim se ztrati obsah session.

Pokud vsak uspim PC pred dojetim limitu a pak to rozbehnu, session dojede jak ma.

Neni nejaka finta jak proces zmrazit / pozastavit pred dojetim limitu popr ho obnovit.

Nevadi mi cekat na obnoveni limitu, vadi miztrata session.
```

```
Ano. Obsah session se nemusí ztratit — problém je, že znovu spouštíš původní skript bez --resume, čímž vytvoříš úplně novou session. Claude Code ukládá konverzace lokálně i v režimu --print a umí pokračovat pomocí --resume <session-id>; ukládání se vypne jen přes --no-session-persistence nebo CLAUDE_CODE_SKIP_PROMPT_HISTORY.

V přiloženém logu je původní rozpracovaná session:

61e19706-0dd7-4835-89b8-3ae12c0b57cc

Pozdější spuštění skriptu vytvořilo novou session c8391abc-..., která okamžitě narazila na limit. Proto by zde --continue mohlo vybrat právě tuto novější prázdnou session; použij explicitní ID.
```

-   Distinct between attempt - the real unknown fail without ressurection and the session ressurection - the known fail with ressurection because of the session limit. The ressurection should be automatic and not require user intervention.
-   The session ressurection is specifically for the Claude code harness, do not implement it for other harnesses. Do not add extra complexity to other harnesses, just implement it for the Claude code harness which should show this specific things in the terminal UI
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts) with claude code harness
-   Add the changes into the [changelog](changelog/_current-preversion.md)


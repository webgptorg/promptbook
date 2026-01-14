codex \
  --ask-for-approval never \
  exec --model gpt-5.2-codex \
  --sandbox danger-full-access \
  -C ~/work/ai/promptbook \
  <<'EOF'

When the agent creates its underlying GPT assistant, the knowledge files are uploaded 1:1 to the OpenAI. Change the logic such as convert the files via scrapers which are already existing in this project and upload just Markdown to OpenAI.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

![Screenshot](./prompts/screenshots/2026-01-0200-agent-use-scrapers-not-raw-files.png)


EOF

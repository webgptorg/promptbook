codex \
  --ask-for-approval never \
  exec --model gpt-5.2-codex \
  --sandbox danger-full-access \
  -C ~/work/ai/promptbook \
  <<'EOF'

Look at file ./README.md and enhance it

- No other changes are needed
- I am just testing your ability to edit files

EOF

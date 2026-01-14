codex \
  --ask-for-approval never \
  exec --model gpt-5.2-codex \
  --sandbox danger-full-access \
  -C ~/work/ai/promptbook \
  <<'EOF'

Look at project and list all top level files, list only a files not directories.

EOF

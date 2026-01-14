codex \
  --ask-for-approval never \
  exec --model gpt-5.2-codex \
  --sandbox danger-full-access \
  -C ~/work/ai/promptbook \
  <<'EOF'

Execute unit tests in the project and report the results

EOF

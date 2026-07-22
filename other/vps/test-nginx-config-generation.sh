#!/usr/bin/env bash

# Smoke test of the nginx configuration generation in `install.sh`.
#
# Verifies the certificate-isolation guarantees:
#   1. A domain WITH an existing Let's Encrypt certificate gets an HTTPS server
#      block plus an HTTP-to-HTTPS redirect.
#   2. A domain WITHOUT a certificate stays reachable over plain HTTP and never
#      produces an HTTPS block referencing missing certificate files.
#   3. Every port-80 server block serves ACME HTTP-01 challenges so certificates
#      can be issued and renewed without certbot editing the configuration.
#   4. The raw-IP default server always exists so the Agents Server stays
#      reachable no matter what happens to any domain.
#
# Run: bash other/vps/test-nginx-config-generation.sh

set -Eeuo pipefail

TEST_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=../../install.sh
source "$TEST_SCRIPT_DIR/../../install.sh"

TEST_FAILURES=0

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="$3"

    if [[ "$haystack" == *"$needle"* ]]; then
        printf 'ok - %s\n' "$message"
    else
        printf 'not ok - %s (missing: %s)\n' "$message" "$needle"
        TEST_FAILURES=$((TEST_FAILURES + 1))
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="$3"

    if [[ "$haystack" != *"$needle"* ]]; then
        printf 'ok - %s\n' "$message"
    else
        printf 'not ok - %s (unexpected: %s)\n' "$message" "$needle"
        TEST_FAILURES=$((TEST_FAILURES + 1))
    fi
}

# --- Arrange a fake certificate store: main domain has a certificate, the
# --- project domain does not.
TEST_TEMPORARY_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_TEMPORARY_DIR"' EXIT

SUDO=()
PORT=4440
LETS_ENCRYPT_LIVE_DIRECTORY="$TEST_TEMPORARY_DIR/letsencrypt-live"
DOMAINS=(agents.example.com)
PROJECT_DOMAINS=(my-project.agents.example.com)

mkdir -p "$LETS_ENCRYPT_LIVE_DIRECTORY/agents.example.com"
printf 'certificate' >"$LETS_ENCRYPT_LIVE_DIRECTORY/agents.example.com/fullchain.pem"
printf 'key' >"$LETS_ENCRYPT_LIVE_DIRECTORY/agents.example.com/privkey.pem"

# --- Act: generate the same configuration `configure_nginx_reverse_proxy`
# --- writes, without touching the system.
agents_server_location_blocks="$(build_nginx_agents_server_location_blocks)"
agent_project_location_blocks="$(build_nginx_agent_project_location_blocks)"

nginx_configuration="$(
    cat <<EOF
map \$http_upgrade \$promptbook_connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 100m;
    include ${NGINX_ERROR_SNIPPET_PATH};

${agents_server_location_blocks}
}
EOF
)"

for domain in "${DOMAINS[@]}"; do
    nginx_configuration+="$(build_nginx_domain_server_blocks "$domain" "$agents_server_location_blocks")"
done

for domain in "${PROJECT_DOMAINS[@]}"; do
    nginx_configuration+="$(build_nginx_domain_server_blocks "$domain" "$agent_project_location_blocks")"
done

# --- Assert
assert_contains "$nginx_configuration" 'listen 80 default_server' \
    'raw-IP default server always exists'
assert_contains "$nginx_configuration" "ssl_certificate ${LETS_ENCRYPT_LIVE_DIRECTORY}/agents.example.com/fullchain.pem" \
    'main domain with certificate serves HTTPS'
assert_contains "$nginx_configuration" 'return 301 https://$host$request_uri;' \
    'main domain with certificate redirects HTTP to HTTPS'
assert_not_contains "$nginx_configuration" "${LETS_ENCRYPT_LIVE_DIRECTORY}/my-project.agents.example.com" \
    'project domain without certificate never references missing certificate files'
assert_contains "$nginx_configuration" 'server_name my-project.agents.example.com;' \
    'project domain without certificate stays reachable over HTTP'
assert_contains "$nginx_configuration" 'auth_request /api/agent-project-runtime-auth;' \
    'project domain proxies through the runtime auth gate'

acme_location_count="$(grep -c 'location \^~ /.well-known/acme-challenge/' <<<"$nginx_configuration")"
http_server_block_count="$(grep -c 'listen 80' <<<"$nginx_configuration")"
if [[ "$acme_location_count" -ge "$http_server_block_count" ]]; then
    printf 'ok - every HTTP server block serves ACME challenges (%s locations, %s blocks)\n' \
        "$acme_location_count" "$http_server_block_count"
else
    printf 'not ok - some HTTP server block misses the ACME challenge location (%s locations, %s blocks)\n' \
        "$acme_location_count" "$http_server_block_count"
    TEST_FAILURES=$((TEST_FAILURES + 1))
fi

https_block_count="$(grep -c 'listen 443 ssl;' <<<"$nginx_configuration")"
if [[ "$https_block_count" -eq 1 ]]; then
    printf 'ok - exactly one HTTPS server block for the one certified domain\n'
else
    printf 'not ok - expected 1 `listen 443 ssl;` line, found %s\n' "$https_block_count"
    TEST_FAILURES=$((TEST_FAILURES + 1))
fi

# --- Certificate for the project domain appears -> HTTPS block appears too.
mkdir -p "$LETS_ENCRYPT_LIVE_DIRECTORY/my-project.agents.example.com"
printf 'certificate' >"$LETS_ENCRYPT_LIVE_DIRECTORY/my-project.agents.example.com/fullchain.pem"
printf 'key' >"$LETS_ENCRYPT_LIVE_DIRECTORY/my-project.agents.example.com/privkey.pem"

regenerated_project_blocks="$(build_nginx_domain_server_blocks 'my-project.agents.example.com' "$agent_project_location_blocks")"
assert_contains "$regenerated_project_blocks" "ssl_certificate ${LETS_ENCRYPT_LIVE_DIRECTORY}/my-project.agents.example.com/fullchain.pem" \
    'project domain serves HTTPS once its certificate exists'

if [[ "$TEST_FAILURES" -gt 0 ]]; then
    printf '%s test(s) failed.\n' "$TEST_FAILURES" >&2
    exit 1
fi

printf 'All nginx configuration generation tests passed.\n'

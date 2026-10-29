#!/usr/bin/env bash
# Paste into a new Ubuntu 24.04 x86-64 Droplet's Startup scripts field.
# Select SSH-key authentication in DigitalOcean and replace the value below first.
set -Eeuo pipefail
umask 022

ssh_source='REPLACE_WITH_YOUR_PUBLIC_IPV4/32'

# Validate before modifying the machine, rather than risking inaccessible SSH.
python3 - "$ssh_source" <<'PY'
import ipaddress
import sys
try:
    network = ipaddress.ip_network(sys.argv[1], strict=True)
    if network.version != 4 or network.prefixlen != 32 or not network.network_address.is_global:
        raise ValueError()
except ValueError:
    sys.exit('Replace ssh_source with your actual public IPv4 address followed by /32.')
PY
if [[ ! -s /root/.ssh/authorized_keys ]]; then
    printf 'Select SSH Key authentication when creating the Droplet. No firewall changes made.\n' >&2
    exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 update
apt-get -o DPkg::Lock::Timeout=300 -o Acquire::Retries=3 install -y --no-install-recommends ca-certificates curl ufw
printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/00-promptbook-key-only.conf
/usr/sbin/sshd -t
systemctl reload ssh
ufw default deny incoming
ufw default allow outgoing
ufw allow from "$ssh_source" to any port 22 proto tcp
ufw --force enable

installer="$(mktemp)"
trap 'rm -f -- "$installer"' EXIT
curl --fail --silent --show-error --location --retry 3 https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/deploy/ubuntu/install.sh -o "$installer"
bash "$installer"

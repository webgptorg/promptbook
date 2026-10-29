# Run Promptbook on your own server

[![Set up a DigitalOcean Droplet](digitalocean/button.svg)](#digitalocean)

**Start with DigitalOcean:** the [Droplet guide](#digitalocean) includes a startup script to paste into the server creation form. [Azure](#azure) provides a direct deployment form; [AWS](#aws) uses a CloudFormation template upload. Every path keeps project data on a persistent disk and uses the same Ubuntu installer. AI login and agenda setup remain attended over SSH.

## DigitalOcean

[Create a Droplet](https://cloud.digitalocean.com/droplets/new) · [Inspect the startup script](digitalocean/user-data.sh) · [Download the startup script](https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/deploy/digitalocean/user-data.sh)

1. Choose **Ubuntu 24.04 LTS x64** (not ARM), your region and a plan with at least **4 GB RAM**, allowing more for heavier browser/harness workloads. Choose **SSH Key** authentication and select your public key. Review the paid plan, disk and backup options.
2. Inspect the linked script and replace `REPLACE_WITH_YOUR_PUBLIC_IPV4/32` with your actual public IPv4 address followed by `/32`. Never insert a private key, password or AI token. A missing/invalid address or absent SSH key stops the script before system changes.
3. Under **Additional Options → Startup scripts**, paste the complete edited script and create the Droplet. It disables password SSH login, allows TCP 22 only from your address through UFW and runs the shared installer. Any attached DigitalOcean Cloud Firewall must also allow that client on TCP 22.
4. Connect with `ssh root@DROPLET_IP` using your selected key. Run `cloud-init status --wait` and check its exit status; inspect `/var/log/cloud-init-output.log` and `/var/log/promptbook-install.log` on failure. An **active** Droplet does not prove installation succeeded. Continue with [Finish setup over SSH](#finish-setup-over-ssh); the engine runs as the separate non-sudo `promptbook` user.

This is a **guided deployment with a script-copy step**. DigitalOcean's standard Deploy button targets App Platform, which has no persistent local filesystem or volume support for this engine's project folders and browser profiles. This repository has no published Promptbook Marketplace image.

If your client IP changes, use the provider's recovery console to update UFW and any Cloud Firewall. Files survive ordinary restarts; **destroying a Droplet destroys its local disk**. Stop active projects and verify a private backup before removal or a consistent snapshot. A powered-off Droplet continues incurring charges until destroyed.

## Azure

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fwebgptorg%2Fpromptbook%2Freborn%2F2026-10%2Fdeploy%2Fazure%2Fazuredeploy.json)

The button opens a deployment form in **your Azure account**. It creates a paid Ubuntu 24.04 x86-64 VM, a persistent 64 GB OS disk, a public IP and a network allowing SSH only from the client address you supply. It installs Node.js 24, npm, Git, Chrome and the published `ptbk` engine. It does **not** create an AI account, supply credentials or initialize an agenda.

Review Azure's regional VM, disk and IP charges before confirming. This is a long-running machine with local files and browser profiles. Short-lived/serverless functions and ephemeral disks are unsuitable substitutes.

1. Open the button, choose a subscription and a **new dedicated resource group**. Choose a region and VM size available to your subscription.
2. Supply your **SSH public key** and your current public client address in CIDR notation (for example `203.0.113.10/32`). The example is not a usable client address. Never supply a private key, AI key or password in the form. Confirm the cost and deploy.
3. Wait for `install-promptbook` to succeed. The Custom Script extension reports installer failures as deployment failures; a running VM alone does not prove installation succeeded. In deployment **Outputs**, copy `sshCommand` and connect.
4. Complete the attended setup below. A failed installation is logged at `/var/log/promptbook-install.log`; Azure also exposes the extension status. Inspect the failure before retrying. A quota, region or VM-size error is an Azure provisioning issue, before Promptbook setup.

The SSH administrator is `ptbkadmin`; the engine runs as the separate **non-sudo `promptbook` user**. No public dashboard/API or Chrome debugging port is opened. If your client IP changes, update the SSH source rule in the VM's network security group.

## AWS

[Open CloudFormation](https://console.aws.amazon.com/cloudformation/) · [Inspect the EC2 template](aws/cloudformation.json) · [Download the EC2 template](https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/deploy/aws/cloudformation.json)

1. Download and inspect the template. Open CloudFormation in your AWS account and select a commercial region with Canonical's Ubuntu SSM parameter and the selected instance type.
2. Choose **Create stack → With new resources (standard) → Choose an existing template → Upload a template file**, and select `cloudformation.json`.
3. Name the new stack, select an existing **EC2 key pair in that region**, and enter your public IPv4 address with `/32` in `SshClientCidr`. Keep `UbuntuAmi` unchanged. The default `t3.medium` has 2 vCPUs/4 GB RAM; larger listed x86-64 types are available. Keep the private key on your computer.
4. Review charges and submit. The template creates a dedicated VPC, public subnet and internet route, SSH-only security group, paid EC2 instance with public IPv4, and an encrypted persistent 64 GB gp3 root EBS volume. It opens no public engine/browser port and creates no instance IAM role. Your account needs permission to create these resources and resolve the Ubuntu SSM parameter.
5. Wait for **CREATE_COMPLETE**: the stack waits up to an hour for the installer to signal success. A running VM alone is insufficient. Inspect stack Events on failure and, if the VM is retained for troubleshooting, `/var/log/cloud-init-output.log` and `/var/log/promptbook-install.log`. Quota/capacity/region errors can occur before installation.
6. Copy `SshCommand` from **Outputs**, connect using the matching private key (`ssh -i /path/to/key ubuntu@PUBLIC_IP`) and complete [Finish setup over SSH](#finish-setup-over-ssh).

This is a **guided deployment with a template-upload step**. A quick-create `templateURL` must point to S3 or a supported Systems Manager document; a raw GitHub URL is unsupported. Until the template is hosted there, the repository uses this working upload path. The template bootstraps a **fresh stack**, not in-place engine upgrades; do not reuse its wait-condition handle for a subsequent bootstrap. Use the ordinary engine update workflow instead.

If your client IP changes, edit the EC2 security-group SSH rule. A stopped/started instance may receive a new public IP; check its current address. The root EBS volume survives ordinary restarts and is retained after instance/stack deletion, including rollback. **Retained EBS disks remain paid**: find the volume in EC2, verify a private backup and delete it explicitly when no longer needed. Retention is not backup. Instance time, disk, public IPv4, transfer and snapshots have separate charges; stopping a VM does not remove them all.

## An existing VPS, including DigitalOcean or Hetzner

Use a fresh **Ubuntu 24.04 x86-64** machine with systemd and outbound HTTPS. Start with enough memory for your chosen harnesses and browser; the Azure default is a 2-vCPU/4-GB machine, not a guarantee for every workload. Connect as your normal SSH administrator and download, inspect, then run the same installer:

```sh
curl -fL https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/deploy/ubuntu/install.sh -o install-promptbook.sh
less install-promptbook.sh
sudo bash install-promptbook.sh
```

The installer resolves npm's `latest` tag once and installs that exact version, recorded in `/opt/promptbook/installed-version`. To select a published version explicitly, pass it as the sole argument: `sudo bash install-promptbook.sh 0.119.0-38`. It leaves an unrelated `ptbk` executable or a conflicting account unchanged and fails rather than overwriting them. It does not upgrade an already-installed engine to a different version. A retry of the same version preserves project files and configuration.

Your provider's firewall remains your responsibility on an existing VPS: allow SSH from your client and keep engine/browser ports private. This manual path does not provision a new server or change its inbound firewall. The Azure template configures its own SSH network rule.

## Finish setup over SSH

The installer supplies the local Git service identity `Promptbook <promptbook@localhost>` only when no identity is configured for the dedicated user. This lets init save its first commit on a fresh machine. An existing identity is preserved; set your preferred `git config --global user.name` and `user.email` as `promptbook` if you want different authorship.

```sh
sudo -iu promptbook
cd ~/projects/my-agenda
ptbk init --path "$PWD"
```

Use the global CLI, select a supported AI harness, complete its native sign-in and choose **Headless** for the browser. The initializer reports any remaining missing access. Provider login may require its documented device-login or SSH callback forwarding; website login requiring a visible browser needs an appropriate private remote desktop/browser setup. The deployment does not bypass these requirements. Do not run the engine as root or put credentials in the ARM template or installer arguments.

The initializer prepares the project and starts the background engine. In the same directory:

```sh
ptbk status
ptbk dashboard
# Close the dashboard, or use another SSH terminal, before opening chat:
ptbk chat
```

Closing a dashboard or disconnecting SSH leaves the daemon working. The installer enables systemd **lingering** for `promptbook`; init/start then registers Promptbook's existing per-project user startup unit. Confirm init/start reports **at boot**, not merely at login. `ptbk stop` deliberately disables automatic startup; use `ptbk start` to enable it again. No extra always-restarting wrapper overrides manual Stop or Panic. Verify with a reboot after your first successful setup, reconnect and run `ptbk status`.

Use the terminal dashboard over SSH. The engine's local browser dashboard and API remain loopback-only; access from your own browser requires an SSH tunnel preserving the engine's local port/origin and its normal local authentication. See [local API access](../specs/cli/api.md). The separate remote-control app is not installed by this template.

## Data, backups, updates and removal

The engine's home is `/var/lib/promptbook`; the first project is `/var/lib/promptbook/projects/my-agenda`. Books, Git history, traces, ignored runtime/Wallet files, browser sessions, native harness sign-ins and user startup registrations stay on the persistent OS disk. They survive a normal reboot. **A persistent disk is not a backup.** Back up the whole home privately, including ignored files, not just Git. Preserve recovery material separately and use the normal Wallet restoration workflow when moving hosts. Never publish this backup or an entire home directory to Git.

Use the ordinary engine update workflow after backing up and stopping active projects. This bootstrap's centrally installed engine is root-owned; an administrator must perform package updates in `/opt/promptbook/engine` with the isolated Node runtime in PATH. Do not delete or reinitialize project folders to update. Harnesses installed by the `promptbook` user live in its writable `~/.local` npm prefix.

Before removing a server, stop work and verify a private backup. The Azure VM's OS disk is configured to detach if just the VM is deleted; it can continue incurring storage charges. **Deleting the dedicated resource group deletes its disk and all its resources**, so do that only after retaining needed data. Stopping an engine or a VM does not remove all disk/IP charges.

## Sources and verification

- [Microsoft's deployment button](https://learn.microsoft.com/azure/azure-resource-manager/templates/deploy-to-azure-button)
- [Linux Custom Script extension](https://learn.microsoft.com/azure/virtual-machines/linux/extensions-customscript)
- [Canonical's Ubuntu image identifiers](https://ubuntu.com/azure/docs/azure-how-to/find-ubuntu-images/)
- [DigitalOcean startup scripts](https://docs.digitalocean.com/products/droplets/how-to/provide-user-data/)
- [DigitalOcean App Platform storage limits](https://docs.digitalocean.com/products/app-platform/details/limits/)
- [AWS CloudFormation template upload](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html)
- [AWS installation wait conditions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-waitcondition.html)
- [Canonical Ubuntu AMIs for CloudFormation](https://documentation.ubuntu.com/aws/aws-how-to/instances/build-cloudformation-templates/)
- [Engine persistence contract](../specs/cli/persistence.md)

Repository checks cover template structure and installer input handling; the server-deployment workflow exercises installation and ordinary project lifecycle on an Ubuntu runner. A successful runner test does not establish subscription availability, a live Azure/DigitalOcean/AWS deployment, provider authentication, or a real reboot test. Validate those in your own deployment.

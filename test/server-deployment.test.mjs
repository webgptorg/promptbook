import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

/** Repository-controlled deployment resources; tests never provision a paid server. */
const root = new URL('../', import.meta.url);
/** Ubuntu bootstrap invoked only through its side-effect-free validation paths here. */
const installer = fileURLToPath(new URL('deploy/ubuntu/install.sh', root));

test('README deploy button targets the actual branch template and its installer', async () => {
    const readme = await readFile(new URL('README.md', root), 'utf8');
    const guide = await readFile(new URL('deploy/README.md', root), 'utf8');
    const template = JSON.parse(await readFile(new URL('deploy/azure/azuredeploy.json', root), 'utf8'));
    const button = readme.match(/\]\((https:\/\/portal\.azure\.com\/[^)]+)\)/)?.[1];
    assert.ok(button);
    assert.equal(decodeURIComponent(button.split('/uri/')[1]), 'https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/deploy/azure/azuredeploy.json');
    assert.ok(guide.includes(button));
    assert.equal(template.variables.installerUrl, 'https://raw.githubusercontent.com/webgptorg/promptbook/reborn/2026-10/deploy/ubuntu/install.sh');
    const extension = template.resources.find(resource => resource.type === 'Microsoft.Compute/virtualMachines/extensions');
    assert.equal(extension.properties.type, 'CustomScript');
    assert.deepEqual(extension.properties.settings.fileUris, ["[variables('installerUrl')]"]);
    assert.equal(extension.properties.settings.commandToExecute, 'bash install.sh --prepare-only', 'an unattended extension never waits for init or sign-in');
});

test('VPS keeps durable storage, key authentication and client-scoped SSH without a public engine port', async () => {
    const template = JSON.parse(await readFile(new URL('deploy/azure/azuredeploy.json', root), 'utf8'));
    const vm = template.resources.find(resource => resource.type === 'Microsoft.Compute/virtualMachines');
    assert.equal(vm.properties.osProfile.linuxConfiguration.disablePasswordAuthentication, true);
    assert.equal(vm.properties.storageProfile.osDisk.createOption, 'FromImage');
    assert.equal(vm.properties.storageProfile.osDisk.managedDisk.storageAccountType, 'StandardSSD_LRS');
    assert.equal(vm.properties.storageProfile.osDisk.deleteOption, 'Detach');
    assert.equal(vm.properties.storageProfile.imageReference.offer, 'ubuntu-24_04-lts');
    assert.equal(vm.properties.storageProfile.imageReference.sku, 'server');
    assert.equal(template.parameters.sshSourceAddressPrefix.defaultValue, undefined);
    const nsg = template.resources.find(resource => resource.type === 'Microsoft.Network/networkSecurityGroups');
    assert.equal(nsg.properties.securityRules.length, 1);
    const rule = nsg.properties.securityRules[0].properties;
    assert.equal(rule.destinationPortRange, '22');
    assert.equal(rule.sourceAddressPrefix, "[parameters('sshSourceAddressPrefix')]");
    const nic = template.resources.find(resource => resource.type === 'Microsoft.Network/networkInterfaces');
    assert.equal(nic.properties.networkSecurityGroup.id, "[resourceId('Microsoft.Network/networkSecurityGroups', variables('name'))]");
});

test('bootstrap has valid Bash syntax and help is safe without provisioning', { skip: process.platform === 'win32' }, () => {
    assert.equal(spawnSync('bash', ['-n', installer], { encoding: 'utf8' }).status, 0);
    const help = spawnSync('bash', [installer, '--help'], { encoding: 'utf8' });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /No AI credentials/);
});

test('bootstrap rejects npm package specs and shell input before any system changes', { skip: process.platform === 'win32' }, () => {
    for (const input of ['--registry=https://example.com', 'file:/tmp/package', 'latest; false', '$(false)', '1.2.3\nfalse', '*']) {
        const result = spawnSync('bash', [installer, input], { encoding: 'utf8' });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /exact published semantic version/);
    }
    const extra = spawnSync('bash', [installer, 'latest', 'unexpected'], { encoding: 'utf8' });
    assert.equal(extra.status, 1);
    assert.match(extra.stderr, /at most one/);
});

test('bootstrap keeps an explicit project folder inside the engine home, before any system changes', { skip: process.platform === 'win32' }, () => {
    for (const path of ['/etc/promptbook', '/var/lib/promptbook', '/var/lib/promptbook/PTBK/project', '/var/lib/promptbook/.ssh', '../escape', '/var/lib/promptbook/PTBK/project/a/../../../x', '/tmp']) {
        const result = spawnSync('bash', [installer, '--init', '--path', path], { encoding: 'utf8' });
        assert.equal(result.status, 1, path);
        assert.match(result.stderr, /inside the engine user's home|without \. or \.\. segments/, path);
    }
    assert.match(spawnSync('bash', [installer, '--init', '--path'], { encoding: 'utf8' }).stderr, /needs a value/);
    assert.match(spawnSync('bash', [installer, '--path', 'PTBK/project/a'], { encoding: 'utf8' }).stderr, /need --init/, 'preparation alone never takes a destination');
    assert.match(spawnSync('bash', [installer, '--', '--non-interactive'], { encoding: 'utf8' }).stderr, /need --init/);
    assert.match(spawnSync('bash', [installer, '--init', '--prepare-only'], { encoding: 'utf8' }).stderr, /not both/);
    // Valid input reaches the privilege check, the first point that could change the machine.
    for (const args of [[], ['--prepare-only'], ['0.119.0-38'], ['--init', '--path', 'PTBK/project/my agenda'], ['--version', '1.2.3', '--init', '--path', '/var/lib/promptbook//PTBK/project/a/'], ['--init', '--', '--non-interactive', '--no-harness']]) {
        const result = spawnSync('bash', [installer, ...args], { encoding: 'utf8' });
        if (process.getuid?.() !== 0) assert.match(result.stderr, /Run this installer with sudo/, args.join(' '));
    }
});

test('the shared installer prepares by default for the website entry and providers; --init hands the terminal to init', async () => {
    const script = await readFile(installer, 'utf8');
    const entry = 'curl -fsSL https://www.ptbk.io/install.sh | bash';
    assert.ok(script.includes(`continuation='${entry}'`), 'pending preparation names the attended one-command entry');
    assert.ok((await readFile(new URL('deploy/README.md', root), 'utf8')).includes(entry));
    assert.ok((await readFile(new URL('README.md', root), 'utf8')).includes(entry));
    assert.match(script, /"\$engine_home\/projects" "\$engine_home\/projects\/my-agenda"/, 'the website entry opens init in this prepared folder');
    assert.match(script, /if \[\[ "\$hand_off" == false \]\]; then\n[^\n]*Server prepared; initialization pending[^\n]*\n\s*exit 0/, 'without --init only preparation happens');
    assert.match(script, /runuser --pty --login --shell \/bin\/bash "\$engine_user" --command "\$init_command" <\/dev\/tty/, 'init runs as the engine user on the live terminal');
    assert.match(script, /PTBK_LOGIN_LOCATION=remote exec ptbk init/, 'the handoff supplies its remote sign-in context');
    assert.match(await readFile(new URL('deploy/digitalocean/user-data.sh', root), 'utf8'), /bash "\$installer" --prepare-only\n$/);
    const aws = JSON.parse(await readFile(new URL('deploy/aws/cloudformation.json', root), 'utf8'));
    assert.match(aws.Resources.Engine.Properties.UserData['Fn::Base64']['Fn::Sub'], /bash "\$installer" --prepare-only\n$/);
});

test('DigitalOcean is the first provider and rejects an unconfigured SSH client before provisioning', { skip: process.platform === 'win32' }, async () => {
    const readme = await readFile(new URL('README.md', root), 'utf8');
    assert.ok(readme.indexOf('deploy/digitalocean/button.svg') < readme.indexOf('aka.ms/deploytoazurebutton'));
    const script = await readFile(new URL('deploy/digitalocean/user-data.sh', root), 'utf8');
    assert.equal(spawnSync('bash', ['-n'], { input: script }).status, 0);
    for (const address of ['REPLACE_WITH_YOUR_PUBLIC_IPV4/32', '0.0.0.0/0', '127.0.0.1/32', '10.0.0.1/32']) {
        const result = spawnSync('bash', ['-s'], { input: script.replace('REPLACE_WITH_YOUR_PUBLIC_IPV4/32', address), encoding: 'utf8' });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /actual public IPv4/);
    }
    assert.match(script, /ufw allow from "\$ssh_source" to any port 22 proto tcp/);
    assert.match(script, /PasswordAuthentication no/);
    assert.match(script, /authorized_keys/);
});

test('AWS has client-scoped SSH, encrypted retained storage, no instance credentials and an installation wait', async () => {
    const template = JSON.parse(await readFile(new URL('deploy/aws/cloudformation.json', root), 'utf8'));
    const { Resources: resources, Parameters: parameters } = template;
    const vm = resources.Engine.Properties;
    assert.equal(parameters.SshClientCidr.Default, undefined);
    const allowed = new RegExp(`^(?:${parameters.SshClientCidr.AllowedPattern})$`);
    assert.ok(allowed.test('8.8.8.8/32'));
    for (const address of ['0.0.0.0/0', '10.0.0.1/32', '127.0.0.1/32', '999.1.2.3/32']) assert.ok(!allowed.test(address));
    assert.deepEqual(resources.SshGroup.Properties.SecurityGroupIngress, [{ IpProtocol: 'tcp', FromPort: 22, ToPort: 22, CidrIp: { Ref: 'SshClientCidr' } }]);
    assert.equal(vm.MetadataOptions.HttpTokens, 'required');
    assert.equal(vm.IamInstanceProfile, undefined);
    assert.equal(vm.BlockDeviceMappings[0].Ebs.Encrypted, true);
    assert.equal(vm.BlockDeviceMappings[0].Ebs.DeleteOnTermination, false);
    assert.equal(resources.Installation.Type, 'AWS::CloudFormation::WaitCondition');
    assert.deepEqual(resources.Installation.Properties.Handle, { Ref: 'InstallHandle' });
    assert.match(parameters.UbuntuAmi.Default, /noble.*amd64/);
});

test('AWS reports both successful and failed installer exits without provisioning a server', { skip: process.platform === 'win32' }, async () => {
    const template = JSON.parse(await readFile(new URL('deploy/aws/cloudformation.json', root), 'utf8'));
    const script = template.Resources.Engine.Properties.UserData['Fn::Base64']['Fn::Sub'].replace('${InstallHandle}', 'https://signal.invalid');
    assert.equal(spawnSync('bash', ['-n'], { input: script }).status, 0);
    const directory = await mkdtemp(join(tmpdir(), 'ptbk-cloud-test-'));
    try {
        await writeFile(join(directory, 'apt-get'), '#!/bin/sh\nexit 0\n');
        await writeFile(join(directory, 'curl'), `#!/bin/bash
if [[ "$*" == *https://signal.invalid* ]]; then printf '%s\\n' "$@" > "$SIGNAL_LOG"; exit 0; fi
while (( $# )); do
    if [[ "$1" == -o ]]; then printf 'exit %s\\n' "$INSTALL_RESULT" > "$2"; exit 0; fi
    shift
done
exit 1
`);
        await chmod(join(directory, 'apt-get'), 0o755);
        await chmod(join(directory, 'curl'), 0o755);
        for (const code of [0, 17]) {
            const signalLog = join(directory, `signal-${code}`);
            const result = spawnSync('bash', ['-s'], { input: script, encoding: 'utf8', env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, INSTALL_RESULT: String(code), SIGNAL_LOG: signalLog } });
            assert.equal(result.status, code, result.stderr);
            const arguments_ = (await readFile(signalLog, 'utf8')).trim().split('\n');
            const payload = JSON.parse(arguments_[arguments_.indexOf('--data-binary') + 1]);
            assert.equal(payload.Status, code === 0 ? 'SUCCESS' : 'FAILURE');
        }
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

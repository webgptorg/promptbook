import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
    assert.equal(extension.properties.settings.commandToExecute, 'bash install.sh');
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

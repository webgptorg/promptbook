import assert from 'node:assert/strict';
import { test } from 'node:test';
import { interpretConfig, parseConfigText, updatePolicyOf } from '../dist/project/config.js';
import { parseVersionRange, policyPermits, rangeAdmits, selectUpdate } from '../dist/project/update-policy.js';

/**
 * The default policy (automatic updates on, no range).
 */
const DEFAULT = { isAutoUpdateEnabled: true };

/**
 * A realistic published history around the current release line.
 */
const PUBLISHED = ['0.118.0', '0.118.1', '0.119.0-38', '0.119.0-39', '0.119.0-40', '0.119.0-41', '0.119.0', '0.119.1', '0.120.0-0', '0.120.0-1', '0.120.0', '0.121.0-3', '1.0.0-0', '1.0.0', '1.1.0'];

test('update policy: stable installations take stable minor/patch within the major, never a prerelease or a major', () => {
    assert.equal(selectUpdate('0.119.0', PUBLISHED, DEFAULT).target, '0.120.0', '0.119.0 → 0.120.0 (minor in major zero, not the caret meaning)');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, DEFAULT).target, undefined, 'no prerelease 0.121.0-3 and no 1.0.0');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, DEFAULT).constraint, 'none');
    assert.equal(selectUpdate('1.0.0', PUBLISHED, DEFAULT).target, '1.1.0');
    assert.equal(selectUpdate('0.118.0', ['0.118.1', '0.118.10', '0.118.9'], DEFAULT).target, '0.118.10', 'numeric, not lexical, ordering');
});

test('update policy: a running prerelease advances on its line, prefers its stable release and never re-enters prereleases', () => {
    assert.equal(selectUpdate('0.119.0-39', ['0.119.0-40', '0.119.0-41'], DEFAULT).target, '0.119.0-41', 'newer prereleases of the same line');
    assert.equal(selectUpdate('0.119.0-39', PUBLISHED, DEFAULT).target, '0.119.0', 'the stable transition wins once published');
    assert.equal(selectUpdate('0.119.0-41', ['0.119.0-41', '0.120.0-0', '0.120.0-1'], DEFAULT).target, undefined, 'no crossing into another prerelease base');
    // After the stable transition the stable rules apply: the next prerelease line is not entered automatically.
    assert.equal(selectUpdate('0.119.0', ['0.119.1-0', '0.120.0-0'], DEFAULT).target, undefined);
    assert.equal(selectUpdate('0.119.0-9', ['0.119.0-10'], DEFAULT).target, '0.119.0-10', 'numeric prerelease ordering');
});

test('update policy: exact pins, explicit ranges, disabled updates and invalid ranges', () => {
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0' }).target, undefined, 'an exact pin never moves away');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0' }).constraint, 'pinned');
    assert.equal(selectUpdate('0.119.0-39', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0-39' }).target, undefined, 'including an exact prerelease pin');
    assert.equal(selectUpdate('0.118.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '=0.119.1' }).target, '0.119.1', 'a newer pin is reached');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '0.119.0' }).target, undefined, 'never downgraded to a pin');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '~0.119.0' }).target, '0.119.1', 'a narrower range is honored');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '>=0.119.0 <2' }).target, '1.1.0', 'an explicit range may allow a major upgrade');
    assert.equal(selectUpdate('0.120.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: '*' }).target, '1.1.0');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: false }).constraint, 'disabled');
    assert.equal(selectUpdate('0.119.0', PUBLISHED, { isAutoUpdateEnabled: true, versionRange: 'latest!' }).constraint, 'invalid');
    // A broad range does not opt a stable installation into prereleases.
    assert.equal(selectUpdate('0.120.0', ['0.121.0-3'], { isAutoUpdateEnabled: true, versionRange: '>=0.120.0' }).target, undefined);
});

test('update policy: npm-style ranges, evaluated against the candidate base release', () => {
    const admits = (range, version) => rangeAdmits(parseVersionRange(range), version);
    assert.ok(admits('^0.119.0', '0.119.5'));
    assert.ok(!admits('^0.119.0', '0.120.0'), 'the caret keeps its own zero-major meaning when written explicitly');
    assert.ok(admits('^1.2.3', '1.9.0'));
    assert.ok(!admits('^1.2.3', '2.0.0'));
    assert.ok(admits('~1.2', '1.2.9'));
    assert.ok(!admits('~1.2', '1.3.0'));
    assert.ok(admits('1.x', '1.4.0'));
    assert.ok(admits('1.2.3 - 1.4', '1.4.7'));
    assert.ok(!admits('1.2.3 - 1.4', '1.5.0'));
    assert.ok(admits('<0.119.0 || >=1.0.0', '1.0.0'));
    assert.ok(admits('>= 0.119.0', '0.119.0-40'), 'a prerelease is evaluated by its base 0.119.0');
    assert.ok(!admits('<0.119.0', '0.119.0-40'));
    assert.equal(parseVersionRange('0.119.0').exact, '0.119.0');
    assert.equal(parseVersionRange('^0.119.0').exact, undefined);
    for (const invalid of ['', 'latest', '>>1', '1.2.3.4', 'abc - 1']) assert.equal(parseVersionRange(invalid), undefined, invalid);
});

test('update policy: shared installations need every associated policy to permit the target', () => {
    assert.ok(policyPermits(DEFAULT, '0.119.0', '0.120.0'));
    assert.ok(!policyPermits({ isAutoUpdateEnabled: true, versionRange: '0.119.0' }, '0.119.0', '0.120.0'), 'one pin blocks the shared replacement');
    assert.ok(!policyPermits({ isAutoUpdateEnabled: false }, '0.119.0', '0.120.0'));
    assert.ok(!policyPermits(DEFAULT, '0.119.0', '1.0.0'));
});

test('update policy: saved in ptbk.json under updates, default on, explicit false and pins preserved', () => {
    const fresh = interpretConfig(parseConfigText('{}'));
    assert.deepEqual(updatePolicyOf(fresh), { isAutoUpdateEnabled: true });
    const saved = interpretConfig(parseConfigText(JSON.stringify({ updates: { isAutoUpdateEnabled: false, versionRange: '0.119.0' } })));
    assert.deepEqual(updatePolicyOf(saved), { isAutoUpdateEnabled: false, versionRange: '0.119.0' });
    assert.ok(!saved.diagnostics.some((diagnostic) => diagnostic.location.includes('updates')), 'updates is a known section');
    const wallet = interpretConfig(parseConfigText(JSON.stringify({ wallet: { isAuditCommitted: false } })));
    assert.ok(!wallet.diagnostics.some((diagnostic) => diagnostic.location.includes('wallet')), 'wallet is a known section too');
    const invalid = interpretConfig(parseConfigText(JSON.stringify({ updates: { versionRange: 'newest please' } })));
    assert.ok(invalid.diagnostics.some((diagnostic) => diagnostic.location === 'ptbk.json › updates.versionRange' && diagnostic.severity === 'error'));
});

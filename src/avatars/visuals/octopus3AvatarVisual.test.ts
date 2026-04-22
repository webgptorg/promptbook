import { describe, expect, it } from '@jest/globals';
import { createSeededRandom } from '../avatarRenderingUtils';
import { createOctopus3MorphologyProfile } from './octopus3AvatarVisual';

/**
 * Number of deterministic Octopus3 profiles covered by the diversity regression.
 */
const TEST_PROFILE_SAMPLE_COUNT = 72;

describe('createOctopus3MorphologyProfile', () => {
    it('spreads seeded agents across distinct body, face, and tentacle families', () => {
        const morphologyProfiles = Array.from({ length: TEST_PROFILE_SAMPLE_COUNT }, (_, sampleIndex) =>
            buildOctopus3MorphologyProfileSample(sampleIndex),
        );
        const bodyFamilies = new Set(morphologyProfiles.map((morphologyProfile) => morphologyProfile.bodyFamily));
        const faceFamilies = new Set(morphologyProfiles.map((morphologyProfile) => morphologyProfile.faceFamily));
        const tentacleCounts = morphologyProfiles.map((morphologyProfile) => morphologyProfile.tentacles.count);
        const bodyAspectRatios = morphologyProfiles.map(
            (morphologyProfile) => morphologyProfile.body.horizontalStretch / morphologyProfile.body.verticalStretch,
        );
        const eyeSpacingRatios = morphologyProfiles.map((morphologyProfile) => morphologyProfile.face.eyeSpacingRatio);

        expect(bodyFamilies).toEqual(new Set(['lantern', 'drifter', 'rounded']));
        expect(faceFamilies).toEqual(new Set(['watchful', 'sleepy', 'mischief']));
        expect(Math.min(...tentacleCounts)).toBeLessThanOrEqual(8);
        expect(Math.max(...tentacleCounts)).toBeGreaterThanOrEqual(11);
        expect(Math.max(...bodyAspectRatios) - Math.min(...bodyAspectRatios)).toBeGreaterThan(0.55);
        expect(Math.max(...eyeSpacingRatios) - Math.min(...eyeSpacingRatios)).toBeGreaterThan(0.04);
    });
});

/**
 * Builds one deterministic Octopus3 morphology profile sample.
 *
 * @param sampleIndex Deterministic sample index.
 * @returns Seeded morphology profile.
 */
function buildOctopus3MorphologyProfileSample(sampleIndex: number) {
    const seedBase = `octopus3-morphology-${sampleIndex}`;
    const createRandom = (salt: string) => createSeededRandom(`${seedBase}|${salt}`);

    return createOctopus3MorphologyProfile(createRandom);
}

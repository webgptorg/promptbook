import { describe, expect, it } from '@jest/globals';
import { createSeededRandom } from '../avatarRenderingUtils';
import { createOrbMorphologyProfile } from './orbAvatarVisual';

/**
 * Number of deterministic Orb profiles covered by the diversity regression.
 */
const TEST_PROFILE_SAMPLE_COUNT = 72;

describe('createOrbMorphologyProfile', () => {
    it('spreads seeded agents across distinct orb families and surface profiles', () => {
        const morphologyProfiles = Array.from({ length: TEST_PROFILE_SAMPLE_COUNT }, (_, sampleIndex) =>
            buildOrbMorphologyProfileSample(sampleIndex),
        );
        const families = new Set(morphologyProfiles.map((morphologyProfile) => morphologyProfile.family));
        const bodyAspectRatios = morphologyProfiles.map(
            (morphologyProfile) => morphologyProfile.horizontalStretch / morphologyProfile.verticalStretch,
        );
        const ringCounts = morphologyProfiles.map((morphologyProfile) => morphologyProfile.ringCount);
        const sparkleCounts = morphologyProfiles.map((morphologyProfile) => morphologyProfile.sparkleCount);
        const baseRadiusRatios = morphologyProfiles.map((morphologyProfile) => morphologyProfile.baseRadiusRatio);

        expect(families).toEqual(new Set(['pearl', 'nebula', 'ember', 'glacier']));
        expect(Math.max(...bodyAspectRatios) - Math.min(...bodyAspectRatios)).toBeGreaterThan(0.15);
        expect(Math.max(...ringCounts) - Math.min(...ringCounts)).toBeGreaterThanOrEqual(2);
        expect(Math.max(...sparkleCounts) - Math.min(...sparkleCounts)).toBeGreaterThanOrEqual(5);
        expect(Math.max(...baseRadiusRatios) - Math.min(...baseRadiusRatios)).toBeGreaterThan(0.04);
    });
});

/**
 * Builds one deterministic Orb morphology profile sample.
 *
 * @param sampleIndex Deterministic sample index.
 * @returns Seeded morphology profile.
 */
function buildOrbMorphologyProfileSample(sampleIndex: number) {
    const seedBase = `orb-morphology-${sampleIndex}`;
    const createRandom = (salt: string) => createSeededRandom(`${seedBase}|${salt}`);

    return createOrbMorphologyProfile(createRandom);
}

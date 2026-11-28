/* eslint-disable no-magic-numbers */

import type { AvatarPalette } from '../types/AvatarVisualDefinition';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One Minecraft-style pixel texture sampled on a cuboid face.
 *
 * @private helper of the Minecraft avatar visuals
 */
export type MinecraftTexture = ReadonlyArray<ReadonlyArray<string>>;

/**
 * Full six-face texture pack for one rendered cuboid.
 *
 * @private helper of the Minecraft avatar visuals
 */
export type MinecraftCuboidTextures = {
    readonly front: MinecraftTexture;
    readonly back: MinecraftTexture;
    readonly left: MinecraftTexture;
    readonly right: MinecraftTexture;
    readonly top: MinecraftTexture;
    readonly bottom: MinecraftTexture;
};

/**
 * Shared subset of avatar colors used by the Minecraft avatar helpers.
 *
 * @private helper of the Minecraft avatar visuals
 */
type MinecraftTexturePalette = Pick<AvatarPalette, 'primary' | 'secondary' | 'accent' | 'highlight' | 'ink' | 'shadow'>;

/**
 * Builds the seeded six-face texture pack used by the Minecraft-style head cuboid.
 *
 * @param random Seeded random generator.
 * @param palette Derived avatar palette.
 * @param hasHeadband Whether the generated avatar should include a colored headband.
 * @returns Head cuboid textures.
 *
 * @private helper of the Minecraft avatar visuals
 */
export function createMinecraftHeadTextures(
    random: () => number,
    palette: MinecraftTexturePalette,
    hasHeadband: boolean,
): MinecraftCuboidTextures {
    const faceTexture = createMinecraftFaceTexture(random, palette, hasHeadband);
    const hairColor = random() < 0.5 ? palette.primary : palette.secondary;
    const skinColor = palette.highlight;
    const headbandColor = hasHeadband ? palette.accent : hairColor;
    const sideTexture = createFilledTexture(skinColor);
    const backTexture = createFilledTexture(skinColor);
    const topTexture = createFilledTexture(hairColor);
    const bottomTexture = createFilledTexture(`${palette.shadow}cc`);

    fillTextureRect(sideTexture, 0, 0, 8, 3, hairColor);
    fillTextureRect(backTexture, 0, 0, 8, 5, hairColor);
    fillTextureRect(backTexture, 1, 5, 6, 1, hairColor);

    if (hasHeadband) {
        fillTextureRect(sideTexture, 0, 2, 8, 1, headbandColor);
        fillTextureRect(backTexture, 0, 2, 8, 1, headbandColor);
        fillTextureRect(topTexture, 0, 4, 8, 1, headbandColor);
    }

    sideTexture[4]![4] = `${palette.shadow}99`;
    sideTexture[5]![4] = `${palette.shadow}cc`;
    backTexture[6]![2] = `${palette.shadow}99`;
    backTexture[6]![5] = `${palette.shadow}99`;

    return {
        front: faceTexture,
        back: backTexture,
        left: sideTexture,
        right: mirrorMinecraftTexture(sideTexture),
        top: topTexture,
        bottom: bottomTexture,
    };
}

/**
 * Builds the seeded six-face texture pack used by the Minecraft-style torso cuboid.
 *
 * @param random Seeded random generator.
 * @param palette Derived avatar palette.
 * @returns Torso cuboid textures.
 *
 * @private helper of the Minecraft avatar visuals
 */
export function createMinecraftTorsoTextures(
    random: () => number,
    palette: MinecraftTexturePalette,
): MinecraftCuboidTextures {
    const frontTexture = createMinecraftShirtTexture(random, palette);
    const sideTexture = createFilledTexture(palette.primary);
    const backTexture = createFilledTexture(palette.primary);
    const topTexture = createFilledTexture(`${palette.highlight}dd`);
    const bottomTexture = createFilledTexture(`${palette.shadow}dd`);
    const stripeColor = random() < 0.5 ? palette.secondary : palette.highlight;

    fillTextureRect(sideTexture, 0, 0, 8, 2, palette.shadow);
    fillTextureRect(backTexture, 0, 0, 8, 2, palette.shadow);
    fillTextureRect(backTexture, 3, 2, 2, 6, stripeColor);
    fillTextureRect(sideTexture, 4, 2, 1, 6, stripeColor);
    fillTextureRect(topTexture, 0, 0, 8, 2, palette.shadow);
    fillTextureRect(topTexture, 2, 2, 4, 4, stripeColor);

    return {
        front: frontTexture,
        back: backTexture,
        left: sideTexture,
        right: mirrorMinecraftTexture(sideTexture),
        top: topTexture,
        bottom: bottomTexture,
    };
}

/**
 * Mirrors one Minecraft texture horizontally.
 *
 * @param texture Source texture.
 * @returns Mirrored texture copy.
 *
 * @private helper of the Minecraft avatar visuals
 */
function mirrorMinecraftTexture(texture: MinecraftTexture): MinecraftTexture {
    return texture.map((row) => [...row].reverse());
}

/**
 * Creates the front-face pixel texture for the cube head.
 *
 * @param random Seeded random generator.
 * @param palette Derived avatar palette.
 * @param hasHeadband Whether the avatar should render a headband row.
 * @returns 8x8 pixel texture.
 *
 * @private helper of the Minecraft avatar visuals
 */
function createMinecraftFaceTexture(
    random: () => number,
    palette: MinecraftTexturePalette,
    hasHeadband: boolean,
): MinecraftTexture {
    const texture = createFilledTexture(palette.highlight);
    const hairlineColor = random() < 0.5 ? palette.primary : palette.secondary;
    const cheekColor = random() < 0.5 ? `${palette.accent}bb` : `${palette.secondary}bb`;

    fillTextureRect(texture, 0, 0, 8, 2, hairlineColor);
    texture[2]![0] = hairlineColor;
    texture[2]![7] = hairlineColor;
    texture[3]![0] = hairlineColor;
    texture[3]![7] = hairlineColor;

    if (hasHeadband) {
        fillTextureRect(texture, 0, 2, 8, 1, palette.accent);
    }

    texture[3]![2] = palette.ink;
    texture[3]![5] = palette.ink;
    texture[4]![2] = '#ffffff';
    texture[4]![5] = '#ffffff';
    texture[5]![1] = cheekColor;
    texture[5]![6] = cheekColor;
    texture[5]![3] = palette.shadow;
    texture[5]![4] = palette.shadow;
    texture[6]![3] = palette.shadow;
    texture[6]![4] = palette.shadow;

    return texture;
}

/**
 * Creates the front-face pixel texture for the torso.
 *
 * @param random Seeded random generator.
 * @param palette Derived avatar palette.
 * @returns 8x8 torso texture.
 *
 * @private helper of the Minecraft avatar visuals
 */
function createMinecraftShirtTexture(random: () => number, palette: MinecraftTexturePalette): MinecraftTexture {
    const texture = createFilledTexture(palette.primary);
    const stripeColor = random() < 0.5 ? palette.secondary : palette.highlight;

    fillTextureRect(texture, 0, 0, 8, 2, palette.shadow);

    for (let rowIndex = 2; rowIndex < 8; rowIndex++) {
        texture[rowIndex]![3] = stripeColor;
        texture[rowIndex]![4] = stripeColor;
    }

    texture[4]![1] = palette.accent;
    texture[4]![6] = palette.accent;
    texture[5]![2] = palette.highlight;
    texture[5]![5] = palette.highlight;

    return texture;
}

/**
 * Creates one solid-color 8x8 Minecraft texture.
 *
 * @param color Fill color.
 * @returns Filled 8x8 texture.
 *
 * @private helper of the Minecraft avatar visuals
 */
function createFilledTexture(color: string): Array<Array<string>> {
    return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => color));
}

/**
 * Fills one rectangular area inside a mutable Minecraft texture.
 *
 * @param texture Mutable target texture.
 * @param x Left texture coordinate.
 * @param y Top texture coordinate.
 * @param width Rectangle width.
 * @param height Rectangle height.
 * @param color Fill color.
 *
 * @private helper of the Minecraft avatar visuals
 */
function fillTextureRect(
    texture: Array<Array<string>>,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
): void {
    for (let rowIndex = y; rowIndex < y + height; rowIndex++) {
        for (let columnIndex = x; columnIndex < x + width; columnIndex++) {
            texture[rowIndex]![columnIndex] = color;
        }
    }
}

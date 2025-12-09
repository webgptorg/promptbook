import type { string_color } from '../../types/typeAliases';
import { $randomItem } from './$randomItem';
import czechFirstFemaleNames from './data/czech-first-female-names.json';
import czechFirstMaleNames from './data/czech-first-male-names.json';
import czechLastFemaleNames from './data/czech-last-female-names.json';
import czechLastMaleNames from './data/czech-last-male-names.json';
import type { GenerateNameResult, NamePool } from './NamePool';

type NameEntry = {
    name: string;
    count: number;
};

// Precompute total counts for weighting
const getTotalCount = (names: ReadonlyArray<NameEntry>) => names.reduce((sum, entry) => sum + entry.count, 0);

const firstFemaleTotal = getTotalCount(czechFirstFemaleNames);
const firstMaleTotal = getTotalCount(czechFirstMaleNames);
const lastFemaleTotal = getTotalCount(czechLastFemaleNames);
const lastMaleTotal = getTotalCount(czechLastMaleNames);

/**
 * Picks a name from the list based on its frequency
 */
function pickWeightedName(names: ReadonlyArray<NameEntry>, totalCount: number): string {
    let random = Math.random() * totalCount;
    for (const entry of names) {
        random -= entry.count;
        if (random <= 0) {
            return entry.name;
        }
    }
    // Fallback (should not happen if logic is correct)
    return names[0]!.name;
}

const COLORS: ReadonlyArray<string_color> = [
    '#e0e0e0', // Light gray
    '#f5f5f5', // Very light gray
    '#fafafa', // Almost white
    '#ffffff', // White
    '#f0f8ff', // Alice blue
    '#f0ffff', // Azure
    '#f5f5dc', // Beige
    '#ffe4c4', // Bisque
    '#ffebcd', // Blanched almond
    '#deb887', // Burlywood
    '#5f9ea0', // Cadet blue
    '#7fff00', // Chartreuse
    '#d2691e', // Chocolate
    '#ff7f50', // Coral
    '#6495ed', // Cornflower blue
    '#fff8dc', // Cornsilk
    '#dc143c', // Crimson
    '#00ffff', // Cyan
    '#00008b', // Dark blue
    '#008b8b', // Dark cyan
    '#b8860b', // Dark goldenrod
    '#a9a9a9', // Dark gray
    '#006400', // Dark green
    '#bdb76b', // Dark khaki
    '#8b008b', // Dark magenta
    '#556b2f', // Dark olive green
    '#ff8c00', // Dark orange
    '#9932cc', // Dark orchid
    '#8b0000', // Dark red
    '#e9967a', // Dark salmon
    '#8fbc8f', // Dark sea green
    '#483d8b', // Dark slate blue
    '#2f4f4f', // Dark slate gray
    '#00ced1', // Dark turquoise
    '#9400d3', // Dark violet
    '#ff1493', // Deep pink
    '#00bfff', // Deep sky blue
    '#696969', // Dim gray
    '#1e90ff', // Dodger blue
    '#b22222', // Firebrick
    '#fffaf0', // Floral white
    '#228b22', // Forest green
    '#ff00ff', // Fuchsia
    '#dcdcdc', // Gainsboro
    '#f8f8ff', // Ghost white
    '#ffd700', // Gold
    '#daa520', // Goldenrod
    '#808080', // Gray
    '#008000', // Green
    '#adff2f', // Green yellow
    '#f0fff0', // Honeydew
    '#ff69b4', // Hot pink
    '#cd5c5c', // Indian red
    '#4b0082', // Indigo
    '#fffff0', // Ivory
    '#f0e68c', // Khaki
    '#e6e6fa', // Lavender
    '#fff0f5', // Lavender blush
    '#7cfc00', // Lawn green
    '#fffacd', // Lemon chiffon
    '#add8e6', // Light blue
    '#f08080', // Light coral
    '#e0ffff', // Light cyan
    '#fafad2', // Light goldenrod yellow
    '#d3d3d3', // Light gray
    '#90ee90', // Light green
    '#ffb6c1', // Light pink
    '#ffa07a', // Light salmon
    '#20b2aa', // Light sea green
    '#87cefa', // Light sky blue
    '#778899', // Light slate gray
    '#b0c4de', // Light steel blue
    '#ffffe0', // Light yellow
    '#00ff00', // Lime
    '#32cd32', // Lime green
    '#faf0e6', // Linen
    '#ff00ff', // Magenta
    '#800000', // Maroon
    '#66cdaa', // Medium aquamarine
    '#0000cd', // Medium blue
    '#ba55d3', // Medium orchid
    '#9370db', // Medium purple
    '#3cb371', // Medium sea green
    '#7b68ee', // Medium slate blue
    '#00fa9a', // Medium spring green
    '#48d1cc', // Medium turquoise
    '#c71585', // Medium violet red
    '#191970', // Midnight blue
    '#f5fffa', // Mint cream
    '#ffe4e1', // Misty rose
    '#ffe4b5', // Moccasin
    '#ffdead', // Navajo white
    '#000080', // Navy
    '#fdf5e6', // Old lace
    '#808000', // Olive
    '#6b8e23', // Olive drab
    '#ffa500', // Orange
    '#ff4500', // Orange red
    '#da70d6', // Orchid
    '#eee8aa', // Pale goldenrod
    '#98fb98', // Pale green
    '#afeeee', // Pale turquoise
    '#db7093', // Pale violet red
    '#ffefd5', // Papaya whip
    '#ffdab9', // Peach puff
    '#cd853f', // Peru
    '#ffc0cb', // Pink
    '#dda0dd', // Plum
    '#b0e0e6', // Powder blue
    '#800080', // Purple
    '#ff0000', // Red
    '#bc8f8f', // Rosy brown
    '#4169e1', // Royal blue
    '#8b4513', // Saddle brown
    '#fa8072', // Salmon
    '#f4a460', // Sandy brown
    '#2e8b57', // Sea green
    '#fff5ee', // Seashell
    '#a0522d', // Sienna
    '#c0c0c0', // Silver
    '#87ceeb', // Sky blue
    '#6a5acd', // Slate blue
    '#708090', // Slate gray
    '#fffafa', // Snow
    '#00ff7f', // Spring green
    '#4682b4', // Steel blue
    '#d2b48c', // Tan
    '#008080', // Teal
    '#d8bfd8', // Thistle
    '#ff6347', // Tomato
    '#40e0d0', // Turquoise
    '#ee82ee', // Violet
    '#f5deb3', // Wheat
    '#ffffff', // White
    '#f5f5f5', // White smoke
    '#ffff00', // Yellow
    '#9acd32', // Yellow green
];

/**
 * Name pool for Czech names
 *
 * @private [🍇] Maybe expose via some package
 */
export const CzechNamePool: NamePool = {
    generateName(): GenerateNameResult {
        const gender = Math.random() < 0.5 ? 'female' : 'male';
        let firstname: string;
        let lastname: string;

        if (gender === 'female') {
            firstname = pickWeightedName(czechFirstFemaleNames, firstFemaleTotal);
            lastname = pickWeightedName(czechLastFemaleNames, lastFemaleTotal);
        } else {
            firstname = pickWeightedName(czechFirstMaleNames, firstMaleTotal);
            lastname = pickWeightedName(czechLastMaleNames, lastMaleTotal);
        }

        // For Czech pool we assign random color as names don't carry color information like in English pool
        const color = $randomItem(...COLORS);

        return {
            fullname: `${firstname} ${lastname}`,
            color,
        };
    },
};

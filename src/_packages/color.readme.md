## 🎨 Core Features

### Color Creation and Parsing

Create colors from various formats including hex, RGB, HSL, and CSS color names:

```typescript
import { Color } from '@promptbook/color';

// From hex values
const blue = Color.fromHex('#009edd');
const shortHex = Color.fromHex('#09d');

// From RGB values
const red = Color.fromValues(255, 0, 0);
const transparentRed = Color.fromValues(255, 0, 0, 128); // 50% alpha

// From CSS color names
const navy = Color.get('midnightblue');

// From various string formats
const color1 = Color.fromString('#ff0000');
const color2 = Color.fromString('rgb(255, 0, 0)');
const color3 = Color.fromString('red');
```

### Color Manipulation

Transform colors using various operators:

```typescript
import { Color, darken, lighten, grayscale, negative } from '@promptbook/color';

const originalColor = Color.fromHex('#009edd');

// Darken and lighten colors
const darker = darken(originalColor, 0.2);
const lighter = lighten(originalColor, 0.3);

// Convert to grayscale
const gray = grayscale(originalColor);

// Create negative/inverted color
const inverted = negative(originalColor);

// Adjust alpha channel
const transparent = withAlpha(originalColor, 0.5);
```

### Color Analysis

Analyze color properties and relationships:

```typescript
import { colorDistance, colorLuminance, colorHue, colorSaturation, areColorsEqual } from '@promptbook/color';

const color1 = Color.fromHex('#ff0000');
const color2 = Color.fromHex('#00ff00');

// Calculate distance between colors
const distance = colorDistance(color1, color2);

// Get color properties
const luminance = colorLuminance(color1);
const hue = colorHue(color1);
const saturation = colorSaturation(color1);

// Compare colors
const areEqual = areColorsEqual(color1, color2);
```

### Color Mixing and Blending

Mix colors and find optimal color combinations:

```typescript
import { mixColors, mixWithColor, nearest, furthest, textColor } from '@promptbook/color';

const red = Color.fromHex('#ff0000');
const blue = Color.fromHex('#0000ff');

// Mix two colors
const purple = mixColors(red, blue, 0.5); // 50/50 mix

// Mix with a specific color
const tinted = mixWithColor(red, Color.fromHex('#ffffff'), 0.2); // Add 20% white

// Find nearest color from a palette
const palette = [Color.get('red'), Color.get('green'), Color.get('blue')];
const closest = nearest(Color.fromHex('#ff3333'), palette);

// Find furthest color for maximum contrast
const contrast = furthest(red, palette);

// Get optimal text color for readability
const textColorForBackground = textColor(Color.fromHex('#333333'));
```

### Random Colors and Utilities

Generate random colors and work with color collections:

```typescript
import { $randomColor, CSS_COLORS, colorToDataUrl } from '@promptbook/color';

// Generate random color
const randomColor = $randomColor();

// Access CSS color constants
const allCssColors = CSS_COLORS;
const specificColor = CSS_COLORS.midnightblue;

// Convert color to data URL (1x1 pixel image)
const dataUrl = colorToDataUrl(Color.fromHex('#ff0000'));
```

## 🔧 Color Class API

The `Color` class provides a comprehensive interface for working with individual colors:

```typescript
import { Color } from '@promptbook/color';

const color = Color.fromHex('#009edd');

// Access color channels
console.log(color.red); // 0-255
console.log(color.green); // 0-255
console.log(color.blue); // 0-255
console.log(color.alpha); // 0-255

// Shorthand properties
console.log(color.r, color.g, color.b, color.a);

// Alpha-related properties
console.log(color.opacity); // Same as alpha
console.log(color.transparency); // 255 - alpha

// Convert to different formats
console.log(color.toHex()); // "#009edd"
console.log(color.toRgb()); // "rgb(0, 158, 221)"
console.log(color.toString()); // Same as toHex()

// Clone color
const cloned = color.clone();
```

## 🎯 Type Safety

All functions are fully typed with TypeScript, providing excellent IDE support and compile-time safety:

```typescript
import type { ColorTransformer } from '@promptbook/color';

// ColorTransformer type for functions that transform colors
const myTransformer: ColorTransformer = (color: Color) => {
    return darken(color, 0.1);
};
```

## 🌈 CSS Color Support

The library includes comprehensive support for CSS color names:

```typescript
import { CSS_COLORS, Color } from '@promptbook/color';

// All standard CSS colors are available
const colors = [
    Color.get('red'),
    Color.get('midnightblue'),
    Color.get('lightcoral'),
    Color.get('darkslategray'),
    // ... and many more
];
```

## 🔄 Fluent API with Take Chain

Many functions return colors wrapped in a "take chain" for fluent operations:

```typescript
import { Color } from '@promptbook/color';

const result = Color.fromHex('#ff0000')
    .then((color) => darken(color, 0.2))
    .then((color) => withAlpha(color, 0.8))
    .then((color) => color.toHex());
```

> 💡 This package is designed to work seamlessly with other Promptbook packages and can be used independently for color manipulation tasks in any JavaScript/TypeScript project.

# 🎨 Design system

In this folder you will find the design system of the project, logo, colors, typography, etc.

- [/](/) Exported files ready-to-use
- [/source](/source) Source files and logo system
- [/people](/people) People behind the project

## Current Promptbook brand

![Promptbook wordmark](readme-wordmark.svg)

The full wordmark uses Inter Medium (500) for `prompt` and Inter Bold (700)
for `book` at equal sizes. The official lowercase abbreviation `ptbk` uses
Inter Medium (500) throughout.

| Background | Full lockup | Abbreviation |
| --- | --- | --- |
| White | [SVG](readme-wordmark.svg) | [SVG](brand/promptbook-abbreviation-light.svg) |
| Ink blue `#17386C` | [SVG](readme-wordmark-dark.svg) | [SVG](brand/promptbook-abbreviation-dark.svg) |
| Black `#000000` | [SVG](brand/promptbook-lockup-black.svg) | [SVG](brand/promptbook-abbreviation-black.svg) |

The [robot](brand/promptbook-robot.svg) is shared with the homepage. Its head
and body use the golden ratio, and the diagonal feet have half the body edge
length. See the brand guide for usage, printable PDFs and raster exports.
[English guide](https://www.ptbk.io/en/branding) · [Czech guide](https://www.ptbk.io/cs/branding)

## macOS installer

Export the [DMG background](brand/macos-dmg-background.svg) at 600 × 380 and
1200 × 760 with Outfit and Inter installed. Save the exports next to the SVG as
`macos-dmg-background.png` and `macos-dmg-background@2x.png`. Finder draws the app
and Applications icons over the artwork at the positions in
[`package-macos.mjs`](../apps/desktop/package-macos.mjs).

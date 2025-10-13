[.]

[✨💤] For the `@promptbook/components` emoticons use the OpenMoji font.

-   Components are in /src/book-components
-   For example [`<Chat/>` component](/src/book-components/Chat/Chat/Chat.tsx)
-   The desired emoji font is in /src/book-components/fonts/OpenMoji-black-glyf.woff2

Something like this:

```css
/**
 * OpenMoji black and white CSS
  *
  * https://github.com/hfg-gmuend/openmoji/blob/master/font/OpenMoji-black-glyf/openmoji.css
 */
@font-face {
    font-family: 'OpenMojiBlack';
    src: url('/fonts/OpenMoji-black-glyf.woff2') format('woff2');
    /* <- !!! Is it working? */
    unicode-range: U+23, U+2A, U+2D, U+30-39, U+A9, U+AE, U+200D, U+203C, U+2049, U+20E3, U+2117, U+2120, U+2122,
        U+2139, U+2194-2199, U+21A9, U+21AA, U+229C, U+231A, U+231B, U+2328, U+23CF, U+23E9-23F3, U+23F8-23FE, U+24C2,
        U+25A1, U+25AA-25AE, U+25B6, U+25C0, U+25C9, U+25D0, U+25D1, U+25E7-25EA, U+25ED, U+25EE, U+25FB-25FE,
        U+2600-2605, U+260E, U+2611, U+2614, U+2615, U+2618, U+261D, U+2620, U+2622, U+2623, U+2626, U+262A, U+262E,
        U+262F, U+2638-263A, U+2640, U+2642, U+2648-2653, U+265F, U+2660, U+2663, U+2665, U+2666, U+2668, U+267B,
        U+267E, U+267F, U+2691-2697, U+2699, U+269B, U+269C, U+26A0, U+26A1, U+26A7, U+26AA, U+26AB, U+26B0, U+26B1,
        U+26BD, U+26BE, U+26C4, U+26C5, U+26C8, U+26CE, U+26CF, U+26D1, U+26D3, U+26D4, U+26E9, U+26EA, U+26F0-26F5,
        U+26F7-26FA, U+26FD, U+2702, U+2705, U+2708-270D, U+270F, U+2712, U+2714, U+2716, U+271D, U+2721, U+2728,
        U+2733, U+2734, U+2744, U+2747, U+274C, U+274E, U+2753-2755, U+2757, U+2763, U+2764, U+2795-2797, U+27A1,
        U+27B0, U+27BF, U+2934, U+2935, U+2B05-2B07, U+2B0C, U+2B0D, U+2B1B, U+2B1C, U+2B1F-2B24, U+2B2E, U+2B2F,
        U+2B50, U+2B55, U+2B58, U+2B8F, U+2BBA-2BBC, U+2BC3, U+2BC4, U+2BEA, U+2BEB, U+3030, U+303D, U+3297, U+3299,
        U+E000-E009, U+E010, U+E011, U+E040-E06D, U+E080-E0B4, U+E0C0-E0CC, U+E0FF-E10D, U+E140-E14A, U+E150-E157,
        U+E181-E189, U+E1C0-E1C4, U+E1C6-E1D9, U+E200-E216, U+E240-E269, U+E280-E283, U+E2C0-E2C4, U+E2C6-E2DA,
        U+E300-E303, U+E305-E30F, U+E312-E316, U+E318-E322, U+E324-E329, U+E32B, U+E340-E348, U+E380, U+E381, U+F000,
        U+F77A, U+F8FF, U+FE0F, U+1F004, U+1F0CF, U+1F10D-1F10F, U+1F12F, U+1F16D-1F171, U+1F17E, U+1F17F, U+1F18E,
        U+1F191-1F19A, U+1F1E6-1F1FF, U+1F201, U+1F202, U+1F21A, U+1F22F, U+1F232-1F23A, U+1F250, U+1F251,
        U+1F260-1F265, U+1F300-1F321, U+1F324-1F393, U+1F396, U+1F397, U+1F399-1F39B, U+1F39E-1F3F0, U+1F3F3-1F3F5,
        U+1F3F7-1F4FD, U+1F4FF-1F53D, U+1F549-1F54E, U+1F550-1F567, U+1F56F, U+1F570, U+1F573-1F57A, U+1F587,
        U+1F58A-1F58D, U+1F590, U+1F595, U+1F596, U+1F5A4, U+1F5A5, U+1F5A8, U+1F5B1, U+1F5B2, U+1F5BC, U+1F5C2-1F5C4,
        U+1F5D1-1F5D3, U+1F5DC-1F5DE, U+1F5E1, U+1F5E3, U+1F5E8, U+1F5EF, U+1F5F3, U+1F5FA-1F64F, U+1F680-1F6C5,
        U+1F6CB-1F6D2, U+1F6D5-1F6D7, U+1F6DC-1F6E5, U+1F6E9, U+1F6EB, U+1F6EC, U+1F6F0, U+1F6F3-1F6FC, U+1F7E0-1F7EB,
        U+1F7F0, U+1F90C-1F93A, U+1F93C-1F945, U+1F947-1F9FF, U+1FA70-1FA7C, U+1FA80-1FA88, U+1FA90-1FABD,
        U+1FABF-1FAC5, U+1FACE-1FADB, U+1FAE0-1FAE8, U+1FAF0-1FAF8, U+1FBC5-1FBC9, U+E0061-E0067, U+E0069,
        U+E006C-E0079, U+E007F;
}
```

-   Do not interact with fonts on the consumer side of `@promptbook/components` package.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨💤] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨💤] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨💤] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

# The `ptbk coder` landing header overflows the page between 768px and ~900px

While rebalancing the hero of [`apps/coder-landing`](../apps/coder-landing) I found that the page scrolls sideways on
every tablet-sized viewport. The header, not the hero, is what overflows:

| Viewport width | `document.documentElement.scrollWidth` | Overflow |
| -------------- | -------------------------------------- | -------- |
| 768px          | 882px                                  | 114px    |
| 834px          | 882px                                  | 48px     |
| 1024px         | 1024px                                 | 0px      |

The overflowing element is the action group of
[`Header.tsx`](../apps/coder-landing/src/components/sections/Header.tsx):

```
<div className="ml-auto hidden items-center gap-3 md:flex">   ->   right edge at 882px
```

The header switches from the hamburger menu to the full desktop layout at `md` (768px), but the navigation links plus
**Star on GitHub** plus **Get started** need about 900px. Between those two widths the navigation wraps into the
wordmark and the **Get started** button is cut off by the right edge of the viewport, while the whole page gains a
horizontal scrollbar - which also lets every section be scrolled away from its own layout. Even at exactly 1024px,
where the page no longer overflows, **How it works** is still wrapped onto two lines.

This is outside the hero and terminal scope of the task I was running, so nothing was changed about it. The fix is
presumably to keep the hamburger menu until `lg`, or to hide the star count / secondary navigation items in the
`md` range.

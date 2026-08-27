# Metadata, sharing previews & SEO

How the page presents itself to search engines, social networks, chat apps and browsers.

## Single source of truth

All copy, URLs and identifiers used by the metadata live in **one** data module (`src/data/siteMetadata.ts`). The page metadata, the sharing image, the structured data, `sitemap.xml` and `robots.txt` all read from it, so they can never disagree about what `ptbk coder` is.

| Value               | Content                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Canonical URL       | `https://coder.ptbk.io`                                                                                   |
| Product name        | `ptbk coder` (split into the lead `ptbk` and the highlighted `coder`)                                     |
| Alternate name      | `Promptbook Coder`                                                                                        |
| Tagline             | `Your coding agents,` + `running your backlog` — the two lines of the [hero](./sections/hero.md) headline |
| Title               | `<product name>: <tagline>`                                                                               |
| Description         | The one-sentence definition from [`product.md`](./product.md), shown in search results                    |
| Sharing description | A shorter, punchier variant shown in sharing previews                                                     |
| Keywords            | From the most specific (`ptbk coder`) to the most generic (harness names)                                 |
| Publisher           | Brand `Promptbook`, legal name `AI Web s.r.o.` (see [`sections/footer.md`](./sections/footer.md))         |
| Theme color         | The page background `#111827` (see [`design.md`](./design.md))                                            |

Every text is validated against the length at which it would be truncated — **60** characters for the title, **160** for the description and **200** for the sharing description. A text which is too long fails the build with an explanatory error instead of being silently cut off in Google.

## Metadata of the page

The document `<head>` declares:

-   `<title>`, `<meta name="description">`, `keywords`, `application-name`, `author`, `creator`, `publisher` and `category`,
-   `<link rel="canonical">` pointing at the canonical URL, so that a preview deployment never competes with production,
-   `robots` and `googlebot` set to `index, follow` with `max-image-preview:large` and unlimited snippets,
-   `theme-color` and `color-scheme: dark`, matching the dark-only design,
-   icons — `favicon.ico`, the same file as the shortcut icon, and the square blue logo as the Apple touch icon.

## Sharing previews

Both **Open Graph** (Facebook, LinkedIn, Discord, Slack, …) and **Twitter cards** are declared:

-   `og:type` `website`, `og:url`, `og:site_name`, `og:locale` `en_US`, `og:title`, `og:description`,
-   `twitter:card` `summary_large_image`, `twitter:title`, `twitter:description`,
-   `og:image` and `twitter:image` — the same 1200 × 630 PNG, with its `alt`, type, width and height.

### The sharing image

The image is **generated from the page data**, not maintained as a binary file, so it can never fall out of sync with the page. Top to bottom:

1.  The brand logo, the `ptbk coder` wordmark (`coder` in the brand blue) and the bare domain in a rounded outline pill,
2.  the two-line tagline — the first line white, the second in the brand blue,
3.  the sharing description,
4.  a terminal window in the visual language of [`components/terminal-block.md`](./components/terminal-block.md) showing the install command and the run command from [`content/commands.md`](./content/commands.md),
5.  a brand gradient bar closing the bottom edge.

The background is the dark page gradient with the same cyan glow as the hero.

## Structured data

One JSON-LD `@graph` (`application/ld+json`) is rendered on the page with four cross-referenced nodes:

| Node                  | Says                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Organization`        | The publisher, its legal name, logo and its profiles on GitHub, npm, LinkedIn and Discord                      |
| `WebSite`             | The short site name Google shows for this domain, its language and its publisher                               |
| `WebPage`             | This page, the site it is part of and the software it is about                                                 |
| `SoftwareApplication` | `ptbk coder` — a `DeveloperApplication`, its operating systems, requirements, repository, license and features |

The feature list and the supported harnesses are taken from the same data modules which render the [features](./sections/advanced-features.md) and [harnesses](./sections/harnesses.md) sections — structured data never claims anything the visitor cannot see on the page.

## `robots.txt` and `sitemap.xml`

-   `/robots.txt` allows every crawler on the whole site and points to the sitemap and the canonical host.
-   `/sitemap.xml` lists the single route `/` with its last modification date, a weekly change frequency and priority `1`. The sections of the page are anchors inside that one route (see [`page-structure.md`](./page-structure.md)), so they are not separate sitemap entries.

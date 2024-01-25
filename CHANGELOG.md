# ⌚ Changelog

## 0.20.0 _(2023-12-29)_

-   Change keyword `USE` to `MODEL VARIANT`
-   Allow to specify exact model eg. `MODEL NAME gpt-4-1106-preview`

## 0.20.1 _(2024-01-15)_

-   Add postprocessing function `trimEndOfCodeBlock`

## 0.20.2 _(2024-01-16)_

-   `replaceParameters` works with inlined JSONs

## 0.23.0 _(2024-01-25)_

-   You are able to send markdown code block in prompts _(without traces of escaping)_
-   Function `trimEndOfCodeBlock` is not working with escaped code blocks JUST with markdown code blocks

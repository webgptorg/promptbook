[ ]

[🎞️📄] Agents server: robust reading of text files with unknown extensions/encodings

-   Problem: Agents can read files, but when user attaches a “text file” with uncommon extension (e.g. subtitle files like `.srt`, `.vtt`, `.ass`, or various domain-specific text formats), the system may treat it as unsupported/binary and refuse or provide garbage output.
-   Goal: Make agents able to read arbitrary attached files as text whenever the content is textual, regardless of filename extension; also handle non‑UTF8 encodings gracefully.
-   Non-goal: Parsing/semantic understanding of every subtitle format; we just need reliable text extraction (raw text). Format-specific parsing can be added later.
-   UX principle: "It shouldn’t matter"—user attaches a file, the agent can read it; if decoding is uncertain, the agent still gets best-effort text + a warning.

-   Implement a single, shared “decode attachment as text” pipeline:
    -   Input: `{ bytes, filename, mimeType? }`
    -   Output: `{ text, encodingUsed, confidence?, warnings: string[], wasBinary: boolean }`
    -   Always attempt decoding unless the file is clearly too large or clearly binary.
-   Detection heuristics (best-effort; keep simple and fast):
    -   Prefer explicit `mimeType` if already known (e.g. `text/*`, `application/json`, `application/xml`, `application/x-subrip`).
    -   If no trustworthy mime type, decide by byte inspection (null bytes / high binary ratio) to classify binary vs text.
    -   If “binary-ish”, still allow override via a tool option `forceText: true` (agent or server can use) and return warnings.
-   Encoding handling:
    -   Support UTF‑8 with/without BOM.
    -   Support UTF‑16LE/UTF‑16BE with BOM.
    -   If no BOM and UTF‑8 decoding produces many replacement chars, try a small set of fallback encodings (to be decided): `windows-1252`, `iso-8859-1`, `cp1250`, etc.
    -   If fallback is used, return `warnings` that encoding was guessed.
    -   Preserve line endings as-is; do not normalize unless required for downstream safety.
-   Size limits / performance:
    -   If above limit, decode first N bytes and append `…[TRUNCATED]…` with warnings.
-   Security:
    -   Never execute or “open” file formats; only decode bytes.
    -   Keep existing sandbox/permissions behavior unchanged.

-   API/tooling requirements:
    -   Update the file-reading capability/tool used by agents so that “read file” routes through this decoding pipeline.
    -   Ensure the agent receives metadata about decoding (encoding used + warnings) alongside content so it can react.

-   Acceptance criteria:
    -   Attaching `.srt` file encoded in UTF‑8 works and agent can read full text.
    -   Attaching `.srt` file encoded in UTF‑16LE (with BOM) works.
    -   Attaching a `.txt` file encoded in `windows-1250` works via fallback and includes warning.
    -   Attaching a file with unknown extension (e.g. `.foo`) but textual content is readable.
    -   Attaching a truly binary file (e.g. `.png`) does not return garbage; it is detected as binary and returns a clear error or `wasBinary=true` with guidance.

-   Developer notes / implementation:
    -   Add unit tests for detection + decoding (include fixtures for a few encodings).

-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

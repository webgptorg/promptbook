/**
 * Inline image protocols of terminal emulators.
 *
 * @private terminal images
 */
export type ImageProtocol = 'iterm' | 'kitty';

/**
 * An image placed over a reserved blank area of a full-screen frame. Text cells of the frame cannot carry it, so the
 * screen sends it once and again only after that area was repainted.
 *
 * @private terminal images
 */
export type ImageOverlay = {
    /** Identity of the file and placement: a changed key replaces the image. */
    readonly key: string;
    /** First row of the area (0-based). */
    readonly row: number;
    /** First column of the area (0-based). */
    readonly column: number;
    /** Rows of the area. */
    readonly rows: number;
    /** The image in the terminal's protocol. */
    readonly sequence: string;
    /** Removes the image where erasing its cells does not (the protocol's own deletion). */
    readonly clear?: string;
};

/**
 * Terminals known by their environment to show images, by the protocol they implement.
 */
const TERM_PROGRAM_PROTOCOLS: Readonly<Record<string, ImageProtocol>> = { 'iTerm.app': 'iterm', WezTerm: 'iterm', mintty: 'iterm', ghostty: 'kitty' };

/**
 * Bytes of base64 payload in one kitty graphics escape sequence (the protocol's chunk limit).
 */
const KITTY_CHUNK_SIZE = 4096;

/**
 * Deletes every image placement of a kitty-protocol terminal, without an answer on stdin.
 */
const KITTY_CLEAR = '\x1b_Ga=d,d=A,q=2\x1b\\';

/**
 * Character cells are about twice as high as wide, which is all a terminal-independent fit can assume.
 */
const CELL_HEIGHT_TO_WIDTH = 2;

/**
 * The image types terminals render (no terminal protocol renders SVG).
 */
const IMAGE_DATA_TYPE = /^data:image\/(png|jpeg|gif|webp);base64,/;

/**
 * The strict shape of an image payload, which is written to the terminal unfiltered: anything else is refused.
 */
const BASE64_PAYLOAD = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * The image protocol of this terminal, detected from its environment without querying it (a question would answer on
 * the dashboard's own input). `PTBK_TERMINAL_IMAGES` names a protocol for a terminal that cannot be recognized, or
 * `off`. Multiplexers do not pass images through, so they count as no support.
 *
 * @private terminal images
 */
export function detectImageProtocol(env: NodeJS.ProcessEnv): ImageProtocol | undefined {
    const configured = env.PTBK_TERMINAL_IMAGES?.trim().toLowerCase();
    if (configured === 'off') return undefined;
    if (configured === 'iterm' || configured === 'kitty') return configured;
    if (env.TMUX || env.STY) return undefined;
    if (env.TERM === 'xterm-kitty' || env.KITTY_WINDOW_ID) return 'kitty';
    return TERM_PROGRAM_PROTOCOLS[env.TERM_PROGRAM ?? ''];
}

/**
 * Pixel size stored in a PNG header.
 */
function pngSize(bytes: Buffer): { readonly width: number; readonly height: number } | undefined {
    if (bytes.length < 24 || bytes.toString('latin1', 12, 16) !== 'IHDR') return undefined;
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    return width > 0 && height > 0 ? { width, height } : undefined;
}

/**
 * Whether a file view's image can be shown by this terminal: a known data shape in a type the protocol takes (kitty's
 * direct transfer takes only PNG). Animated images stay out of reduced-motion terminals.
 *
 * @private terminal images
 */
export function canShowImage(image: string | undefined, terminal: { readonly images?: ImageProtocol; readonly reducedMotion?: boolean }): image is string {
    if (!image || !terminal.images) return false;
    const type = IMAGE_DATA_TYPE.exec(image)?.[1];
    if (!type || (type === 'gif' && terminal.reducedMotion)) return false;
    return terminal.images === 'iterm' || type === 'png';
}

/**
 * The escape sequence showing a displayable image inside an area of character cells, keeping its aspect ratio.
 *
 * @private terminal images
 */
export function imageSequence(image: string, protocol: ImageProtocol, area: { readonly columns: number; readonly rows: number }): { readonly sequence: string; readonly clear?: string } | undefined {
    const prefix = IMAGE_DATA_TYPE.exec(image)?.[0];
    const payload = prefix ? image.slice(prefix.length) : undefined;
    if (!payload || !BASE64_PAYLOAD.test(payload)) return undefined;
    const bytes = Buffer.from(payload, 'base64');
    if (protocol === 'iterm') {
        return { sequence: `\x1b]1337;File=inline=1;size=${bytes.length};width=${area.columns};height=${area.rows};preserveAspectRatio=1:${payload}\x07` };
    }
    const size = pngSize(bytes);
    if (!size) return undefined;
    const fitsWidth = area.columns / size.width <= (area.rows * CELL_HEIGHT_TO_WIDTH) / size.height;
    const columns = fitsWidth ? area.columns : Math.max(1, Math.round((area.rows * CELL_HEIGHT_TO_WIDTH * size.width) / size.height));
    const rows = fitsWidth ? Math.max(1, Math.round((area.columns * size.height) / size.width / CELL_HEIGHT_TO_WIDTH)) : area.rows;
    let sequence = '';
    for (let offset = 0; offset < payload.length; offset += KITTY_CHUNK_SIZE) {
        const more = offset + KITTY_CHUNK_SIZE < payload.length ? 1 : 0;
        sequence += `\x1b_G${offset === 0 ? `a=T,f=100,q=2,C=1,c=${columns},r=${rows},` : ''}m=${more};${payload.slice(offset, offset + KITTY_CHUNK_SIZE)}\x1b\\`;
    }
    return { sequence, clear: KITTY_CLEAR };
}

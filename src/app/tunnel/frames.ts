/**
 * Frame types of tunnel protocol v1 (codes in bits 0–6 of the type byte; bit 7 marks an ignorable frame).
 *
 * @private App tunnel
 */
export const FRAME_TYPE = Object.freeze({ OPEN: 1, DATA: 2, CLOSE: 3, WINDOW: 4 } as const);

/**
 * The ignorable flag of the type byte; never set on v1 types.
 *
 * @private App tunnel
 */
export const FRAME_IGNORABLE_FLAG = 0x80;

/**
 * `[u8 type][u32 streamId, big-endian]`.
 *
 * @private App tunnel
 */
export const FRAME_HEADER_BYTES = 5;

/**
 * Largest DATA payload.
 *
 * @private App tunnel
 */
export const MAX_FRAME_PAYLOAD_BYTES = 65_536;

/**
 * Largest WINDOW increment and the most credit a window may hold.
 *
 * @private App tunnel
 */
export const MAX_WINDOW_BYTES = 0x7fff_ffff;

/**
 * Credit each direction of a stream starts with.
 *
 * @private App tunnel
 */
export const INITIAL_WINDOW_BYTES = 262_144;

/**
 * Smallest WINDOW grant worth a frame: smaller grants are collected (each frame counts against the relay's budget)
 * unless the window would otherwise close.
 *
 * @private App tunnel
 */
export const FLOW_CONTROL_GRANT_BYTES = 1024;

/**
 * Why one stream closed.
 *
 * @private App tunnel
 */
export const CLOSE_CODE = Object.freeze({ NORMAL: 0, RESET: 1, REFUSED: 2, TIMEOUT: 3, FLOW_CONTROL: 4 } as const);

/**
 * One stream close code.
 *
 * @private App tunnel
 */
export type CloseCode = (typeof CLOSE_CODE)[keyof typeof CLOSE_CODE];

/**
 * The known stream close codes.
 */
const CLOSE_CODES: ReadonlySet<number> = new Set(Object.values(CLOSE_CODE));

/**
 * One decoded tunnel frame.
 *
 * @private App tunnel
 */
export type Frame =
    | { readonly type: 1; readonly streamId: number; readonly family: 4 | 6; readonly address: Uint8Array; readonly port: number }
    | { readonly type: 2; readonly streamId: number; readonly payload: Uint8Array }
    | { readonly type: 3; readonly streamId: number; readonly code: CloseCode }
    | { readonly type: 4; readonly streamId: number; readonly increment: number };

/**
 * Why a frame is invalid.
 *
 * @private App tunnel
 */
export type FrameInvalidReason = 'too-short' | 'unknown-type' | 'bad-flags' | 'stream-id-zero' | 'payload-too-large' | 'empty-data' | 'bad-open-payload' | 'bad-close-code' | 'bad-window-increment' | 'trailing-bytes';

/**
 * The result of decoding one binary message: a frame, an ignorable frame to drop, or a protocol error.
 *
 * @private App tunnel
 */
export type FrameDecode = { readonly kind: 'frame'; readonly frame: Frame } | { readonly kind: 'ignored'; readonly typeCode: number } | { readonly kind: 'invalid'; readonly reason: FrameInvalidReason };

/**
 * Allocates a frame with its header.
 */
function header(type: number, streamId: number, payloadBytes: number): { bytes: Uint8Array; view: DataView } {
    if (!Number.isInteger(streamId) || streamId < 1 || streamId > 0xffff_ffff) throw new RangeError('A stream ID is a non-zero u32.');
    const bytes = new Uint8Array(FRAME_HEADER_BYTES + payloadBytes);
    const view = new DataView(bytes.buffer);
    view.setUint8(0, type);
    view.setUint32(1, streamId);
    return { bytes, view };
}

/**
 * Encodes one frame as one binary WebSocket message. Throws for a frame the decoder would refuse (a bug in the sender).
 *
 * @private App tunnel
 */
export function encodeFrame(frame: Frame): Uint8Array {
    switch (frame.type) {
        case FRAME_TYPE.OPEN: {
            if (frame.address.length !== (frame.family === 4 ? 4 : 16)) throw new RangeError('The OPEN address does not match its family.');
            if (!Number.isInteger(frame.port) || frame.port < 0 || frame.port > 0xffff) throw new RangeError('The OPEN port is a u16.');
            const { bytes, view } = header(frame.type, frame.streamId, 1 + frame.address.length + 2);
            view.setUint8(FRAME_HEADER_BYTES, frame.family);
            bytes.set(frame.address, FRAME_HEADER_BYTES + 1);
            view.setUint16(FRAME_HEADER_BYTES + 1 + frame.address.length, frame.port);
            return bytes;
        }
        case FRAME_TYPE.DATA: {
            if (frame.payload.length < 1 || frame.payload.length > MAX_FRAME_PAYLOAD_BYTES) throw new RangeError('A DATA payload has 1 to 65536 bytes.');
            const { bytes } = header(frame.type, frame.streamId, frame.payload.length);
            bytes.set(frame.payload, FRAME_HEADER_BYTES);
            return bytes;
        }
        case FRAME_TYPE.CLOSE: {
            if (!CLOSE_CODES.has(frame.code)) throw new RangeError('Unknown CLOSE code.');
            const { bytes, view } = header(frame.type, frame.streamId, 1);
            view.setUint8(FRAME_HEADER_BYTES, frame.code);
            return bytes;
        }
        case FRAME_TYPE.WINDOW: {
            if (!Number.isInteger(frame.increment) || frame.increment < 1 || frame.increment > MAX_WINDOW_BYTES) throw new RangeError('A WINDOW increment is 1..2^31-1.');
            const { bytes, view } = header(frame.type, frame.streamId, 4);
            view.setUint32(FRAME_HEADER_BYTES, frame.increment);
            return bytes;
        }
    }
}

/**
 * Checks a fixed payload length.
 */
function fixed(payload: Uint8Array, length: number): FrameInvalidReason | undefined {
    if (payload.length < length) return 'too-short';
    if (payload.length > length) return 'trailing-bytes';
    return undefined;
}

/**
 * Decodes one binary WebSocket message. Total over untrusted bytes: never throws and never reads past the input. Checks
 * run in the contract's order: header length, payload size, type byte, stream ID, then the type's payload rules.
 *
 * @private App tunnel
 */
export function decodeFrame(bytes: Uint8Array): FrameDecode {
    if (bytes.length < FRAME_HEADER_BYTES) return { kind: 'invalid', reason: 'too-short' };
    if (bytes.length - FRAME_HEADER_BYTES > MAX_FRAME_PAYLOAD_BYTES) return { kind: 'invalid', reason: 'payload-too-large' };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const typeByte = view.getUint8(0);
    const code = typeByte & 0x7f;
    const ignorable = (typeByte & FRAME_IGNORABLE_FLAG) !== 0;
    if (code === 0) return { kind: 'invalid', reason: 'unknown-type' };
    if (code > FRAME_TYPE.WINDOW) return ignorable ? { kind: 'ignored', typeCode: code } : { kind: 'invalid', reason: 'unknown-type' };
    if (ignorable) return { kind: 'invalid', reason: 'bad-flags' };
    const streamId = view.getUint32(1);
    if (streamId === 0) return { kind: 'invalid', reason: 'stream-id-zero' };
    const payload = bytes.subarray(FRAME_HEADER_BYTES);
    const payloadView = new DataView(bytes.buffer, bytes.byteOffset + FRAME_HEADER_BYTES, payload.length);
    switch (code) {
        case FRAME_TYPE.OPEN: {
            const family = payload[0];
            if (family !== 4 && family !== 6) return { kind: 'invalid', reason: 'bad-open-payload' };
            const length = family === 4 ? 4 : 16;
            if (payload.length !== 1 + length + 2) return { kind: 'invalid', reason: 'bad-open-payload' };
            return { kind: 'frame', frame: { type: FRAME_TYPE.OPEN, streamId, family, address: payload.slice(1, 1 + length), port: payloadView.getUint16(1 + length) } };
        }
        case FRAME_TYPE.DATA:
            if (payload.length === 0) return { kind: 'invalid', reason: 'empty-data' };
            return { kind: 'frame', frame: { type: FRAME_TYPE.DATA, streamId, payload: payload.slice() } };
        case FRAME_TYPE.CLOSE: {
            const malformed = fixed(payload, 1);
            if (malformed) return { kind: 'invalid', reason: malformed };
            const closeCode = payloadView.getUint8(0);
            if (!CLOSE_CODES.has(closeCode)) return { kind: 'invalid', reason: 'bad-close-code' };
            return { kind: 'frame', frame: { type: FRAME_TYPE.CLOSE, streamId, code: closeCode as CloseCode } };
        }
        default: {
            const malformed = fixed(payload, 4);
            if (malformed) return { kind: 'invalid', reason: malformed };
            const increment = payloadView.getUint32(0);
            if (increment < 1 || increment > MAX_WINDOW_BYTES) return { kind: 'invalid', reason: 'bad-window-increment' };
            return { kind: 'frame', frame: { type: FRAME_TYPE.WINDOW, streamId, increment } };
        }
    }
}

/**
 * Credit accounting for one direction of one stream, in DATA payload bytes. `consume` and `grant` return `false`
 * (leaving the credit unchanged) instead of wrapping around: more than the credit, or a window past the maximum.
 *
 * @private App tunnel
 */
export class FlowWindow {
    public constructor(private credit: number = INITIAL_WINDOW_BYTES) {}

    /** Takes `bytes` of credit; `false` when they exceed it. */
    public consume(bytes: number): boolean {
        if (bytes > this.credit) return false;
        this.credit -= bytes;
        return true;
    }

    /** Adds `bytes` of credit; `false` when the window would exceed the maximum. */
    public grant(bytes: number): boolean {
        if (bytes > MAX_WINDOW_BYTES - this.credit) return false;
        this.credit += bytes;
        return true;
    }

    /** The credit left. */
    public get available(): number {
        return this.credit;
    }
}

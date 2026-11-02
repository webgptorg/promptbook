/** Wraps the existing 256px PNG logo in the standard PNG-compressed ICO container without resampling it. */
export function windowsIcon(png) {
    if (!Buffer.isBuffer(png) || png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== 256 || png.readUInt32BE(20) !== 256) throw new Error('The desktop icon requires the existing 256x256 PNG logo.');
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2); // ICO container.
    header.writeUInt16LE(1, 4); // One image; zero width/height bytes mean 256px.
    header.writeUInt16LE(1, 10); // Color planes.
    header.writeUInt16LE(32, 12); // RGBA bit depth.
    header.writeUInt32LE(png.length, 14);
    header.writeUInt32LE(header.length, 18);
    return Buffer.concat([header, png]);
}

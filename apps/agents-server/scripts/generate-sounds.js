const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../public/sounds');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// WAV Header helper
function writeWavHeader(sampleRate, numChannels, numSamples) {
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = numSamples * numChannels * 2;
    const buffer = Buffer.alloc(44);

    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
}

// Sound generators
function generateTone(freq, duration, type = 'sine', volume = 0.5) {
    const sampleRate = 44100;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Envelope (Attack/Decay)
        let envelope = 1;
        const attackTime = 0.01;
        const releaseTime = duration - attackTime;

        if (t < attackTime) {
            envelope = t / attackTime;
        } else {
            envelope = 1 - (t - attackTime) / releaseTime;
        }

        // Waveform
        if (type === 'sine') {
            sample = Math.sin(2 * Math.PI * freq * t);
        } else if (type === 'square') {
            sample = Math.sign(Math.sin(2 * Math.PI * freq * t));
        } else if (type === 'sawtooth') {
            sample = 2 * (t * freq - Math.floor(t * freq + 0.5));
        } else if (type === 'noise') {
            sample = Math.random() * 2 - 1;
        }

        // Apply volume and envelope
        sample *= volume * envelope;

        // Clip
        sample = Math.max(-1, Math.min(1, sample));

        // Write 16-bit PCM
        buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }

    return Buffer.concat([writeWavHeader(sampleRate, 1, numSamples), buffer]);
}

function generateChord(freqs, duration, volume = 0.5) {
    const sampleRate = 44100;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Envelope
        let envelope = 1;
        if (t < 0.05) envelope = t / 0.05;
        else envelope = Math.exp(-(t - 0.05) * 3); // Exponential decay

        // Sum frequencies
        for (const freq of freqs) {
            sample += Math.sin(2 * Math.PI * freq * t);
        }
        sample /= freqs.length; // Normalize

        sample *= volume * envelope;
        sample = Math.max(-1, Math.min(1, sample));
        buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }
    return Buffer.concat([writeWavHeader(sampleRate, 1, numSamples), buffer]);
}

function generateWhoosh(duration, volume = 0.5) {
    const sampleRate = 44100;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;

        // Envelope: Fade in then out
        let envelope = 0;
        if (t < duration / 2) {
            envelope = t / (duration / 2);
        } else {
            envelope = 1 - (t - duration / 2) / (duration / 2);
        }

        let sample = Math.random() * 2 - 1;

        // Simple low pass filter (moving average)
        // Note: This is very crude inside the loop without state, effectively just random
        // Real LPF needs state.
        // Let's just use raw noise but envelope it heavily.

        sample *= volume * envelope * envelope; // Squared envelope for smoother curve

        buffer.writeInt16LE(Math.floor(sample * 32767), i * 2);
    }
    return Buffer.concat([writeWavHeader(sampleRate, 1, numSamples), buffer]);
}

// Generate files
console.log('Generating sounds...');

// Ding: 880Hz (A5)
fs.writeFileSync(path.join(OUTPUT_DIR, 'ding.wav'), generateTone(880, 0.8, 'sine', 0.5));
console.log('Generated ding.wav');

// Typing: Short click
fs.writeFileSync(path.join(OUTPUT_DIR, 'typing.wav'), generateTone(1200, 0.05, 'noise', 0.2));
console.log('Generated typing.wav');

// Tap: Lower click
fs.writeFileSync(path.join(OUTPUT_DIR, 'tap.wav'), generateTone(400, 0.05, 'sine', 0.3));
console.log('Generated tap.wav');

// Whoosh: Noise with envelope
fs.writeFileSync(path.join(OUTPUT_DIR, 'whoosh.wav'), generateWhoosh(0.4, 0.3));
console.log('Generated whoosh.wav');

// Confetti: Major chord (C5, E5, G5, C6) -> 523.25, 659.25, 783.99, 1046.50
fs.writeFileSync(path.join(OUTPUT_DIR, 'confetti.wav'), generateChord([523.25, 659.25, 783.99, 1046.5], 1.5, 0.4));
console.log('Generated confetti.wav');

// Hearts: Two notes (C5, E5) gentle
fs.writeFileSync(path.join(OUTPUT_DIR, 'hearts.wav'), generateChord([523.25, 659.25], 1.0, 0.4));
console.log('Generated hearts.wav');

console.log('Done.');

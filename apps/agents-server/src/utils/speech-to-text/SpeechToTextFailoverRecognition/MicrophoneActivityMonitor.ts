/**
 * FFT size used by the background activity monitor.
 */
const AUDIO_MONITOR_FFT_SIZE = 2048;

/**
 * Midpoint of unsigned 8-bit PCM analyzer data.
 */
const PCM_U8_MIDPOINT = 128;

/**
 * Lightweight microphone activity monitor used by speech-to-text stall detection.
 *
 * @private function of SpeechToTextFailoverRecognition
 */
export class MicrophoneActivityMonitor {
    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private frameId: number | null = null;

    /**
     * Starts activity monitoring and reports normalized audio levels.
     */
    public start(onAudioLevel: (level: number) => void): void {
        void this.startAsync(onAudioLevel);
    }

    /**
     * Stops monitoring and releases browser resources.
     */
    public stop(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.audioContext) {
            void this.audioContext.close().catch(() => undefined);
            this.audioContext = null;
        }

        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
            this.stream = null;
        }

        this.analyser = null;
    }

    /**
     * Async setup for analyzer graph.
     */
    private async startAsync(onAudioLevel: (level: number) => void): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new AudioContext();
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = AUDIO_MONITOR_FFT_SIZE;
            this.sourceNode.connect(this.analyser);

            const sampleBuffer = new Uint8Array(this.analyser.fftSize);

            const poll = () => {
                if (!this.analyser) {
                    return;
                }

                this.analyser.getByteTimeDomainData(sampleBuffer);

                let sumOfSquares = 0;
                for (const value of sampleBuffer) {
                    const normalizedSample = (value - PCM_U8_MIDPOINT) / PCM_U8_MIDPOINT;
                    sumOfSquares += normalizedSample * normalizedSample;
                }

                const rootMeanSquare = Math.sqrt(sumOfSquares / sampleBuffer.length);
                onAudioLevel(rootMeanSquare);

                this.frameId = requestAnimationFrame(poll);
            };

            this.frameId = requestAnimationFrame(poll);
        } catch {
            this.stop();
        }
    }
}

import { resolveOpenAiSpeechRecognitionAudioFileDescriptor, resolveOpenAiSpeechRecognitionPreferredRecordingFormat } from './OpenAiSpeechRecognition';

describe('OpenAiSpeechRecognition helpers', () => {
    const originalMediaRecorder = globalThis.MediaRecorder;

    afterEach(() => {
        globalThis.MediaRecorder = originalMediaRecorder;
    });

    it('prefers the first supported recorder output format', () => {
        const fakeMediaRecorder = class FakeMediaRecorder {};
        globalThis.MediaRecorder = fakeMediaRecorder as unknown as typeof MediaRecorder;
        globalThis.MediaRecorder.isTypeSupported = jest.fn((mimeType: string) => mimeType === 'audio/mp4');

        expect(resolveOpenAiSpeechRecognitionPreferredRecordingFormat()).toEqual({
            mimeType: 'audio/mp4',
            fileExtension: 'mp4',
        });
    });

    it('derives file name and MIME type from the recorder output', () => {
        expect(
            resolveOpenAiSpeechRecognitionAudioFileDescriptor({
                recorderMimeType: 'audio/webm;codecs=opus',
                audioChunks: [],
            }),
        ).toEqual({
            mimeType: 'audio/webm',
            fileName: 'speech-recording.webm',
        });
    });

    it('falls back to chunk MIME type when recorder metadata is empty', () => {
        expect(
            resolveOpenAiSpeechRecognitionAudioFileDescriptor({
                recorderMimeType: '',
                audioChunks: [new Blob(['audio'], { type: 'audio/ogg;codecs=opus' })],
            }),
        ).toEqual({
            mimeType: 'audio/ogg',
            fileName: 'speech-recording.ogg',
        });
    });
});

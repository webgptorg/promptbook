import {
    FILE_UPLOAD_REQUIRES_SERVER_DOMAIN_MESSAGE,
    resolveFileUploadAvailability,
} from './fileUploadAvailability';

describe('resolveFileUploadAvailability', () => {
    it('blocks self-contained S3 uploads before a server/domain is selected', () => {
        expect(
            resolveFileUploadAvailability({
                serverId: null,
                serverPublicUrl: new URL('http://203.0.113.42'),
                isSelfContainedS3StorageSelected: true,
            }),
        ).toEqual({
            isUploadAvailable: false,
            message: FILE_UPLOAD_REQUIRES_SERVER_DOMAIN_MESSAGE,
        });
    });

    it('allows self-contained S3 uploads for a registered server', () => {
        expect(
            resolveFileUploadAvailability({
                serverId: -1,
                serverPublicUrl: new URL('https://s22.ptbk.io'),
                isSelfContainedS3StorageSelected: true,
            }),
        ).toEqual({
            isUploadAvailable: true,
            message: null,
        });
    });

    it('allows local development without a registered server', () => {
        expect(
            resolveFileUploadAvailability({
                serverId: null,
                serverPublicUrl: new URL('http://localhost:4440'),
                isSelfContainedS3StorageSelected: true,
            }),
        ).toEqual({
            isUploadAvailable: true,
            message: null,
        });
    });

    it('allows non-self-contained storage without a registered server', () => {
        expect(
            resolveFileUploadAvailability({
                serverId: null,
                serverPublicUrl: new URL('https://legacy.example.com'),
                isSelfContainedS3StorageSelected: false,
            }),
        ).toEqual({
            isUploadAvailable: true,
            message: null,
        });
    });
});

import { createHash, createPrivateKey, randomBytes, webcrypto, type KeyObject } from 'node:crypto';
import { x509 } from '../../vendor/app-platform.js';

/**
 * ECDSA P-256 with SHA-256: the algorithm of every key and signature the engine creates for TLS.
 */
const EC_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' } as const;

/**
 * The `id-pe-acmeIdentifier` extension of RFC 8737.
 */
const ACME_IDENTIFIER_OID = '1.3.6.1.5.5.7.1.31';

/**
 * `id-kp-serverAuth`.
 */
const SERVER_AUTH_OID = '1.3.6.1.5.5.7.3.1';

/**
 * One certificate chain with its private key, as `node:tls` takes them.
 *
 * @private App web origin
 */
export type TlsCredentials = {
    /** Leaf first, then intermediates (PEM). */
    readonly certificatePem: string;
    /** PKCS#8 PEM; never logged or serialized. */
    readonly keyPem: string;
    readonly notBefore: Date;
    readonly notAfter: Date;
};

/**
 * A fresh ECDSA P-256 key pair (extractable, so its private key can be stored as PKCS#8).
 *
 * @private App web origin
 */
export async function generateTlsKeyPair(): Promise<CryptoKeyPair> {
    return (await webcrypto.subtle.generateKey(EC_ALGORITHM, true, ['sign', 'verify'])) as CryptoKeyPair;
}

/**
 * PKCS#8 PEM of a WebCrypto private key.
 *
 * @private App web origin
 */
export async function privateKeyPem(key: CryptoKey): Promise<string> {
    const der = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', key));
    return `-----BEGIN PRIVATE KEY-----\n${der.toString('base64').replace(/.{1,64}/g, '$&\n')}-----END PRIVATE KEY-----\n`;
}

/**
 * Imports a PKCS#8 PEM P-256 private key as a WebCrypto key pair (the public key derived from it).
 *
 * @private App web origin
 */
export async function importTlsKeyPair(pem: string): Promise<CryptoKeyPair> {
    const keyObject: KeyObject = createPrivateKey(pem);
    const privateKey = await webcrypto.subtle.importKey('pkcs8', keyObject.export({ type: 'pkcs8', format: 'der' }), EC_ALGORITHM, true, ['sign']);
    const jwk = keyObject.export({ format: 'jwk' });
    const publicKey = await webcrypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, EC_ALGORITHM, true, ['verify']);
    return { privateKey, publicKey };
}

/**
 * A random positive serial number (hexadecimal, 16 bytes).
 */
function serialNumber(): string {
    const bytes = randomBytes(16);
    bytes[0] = (bytes[0] ?? 0) & 0x7f;
    return bytes.toString('hex');
}

/**
 * The RFC 8737 challenge certificate: self-signed for `hostname` (SAN only), with the critical `acmeIdentifier`
 * extension holding the SHA-256 of the key authorization, valid for a week around now.
 *
 * @private App web origin
 */
export async function createAcmeChallengeCertificate(hostname: string, keyAuthorization: string): Promise<TlsCredentials> {
    const keys = await generateTlsKeyPair();
    const digest = createHash('sha256').update(keyAuthorization).digest();
    // The extension value is the DER encoding of an OCTET STRING holding the 32-byte digest.
    const value = Buffer.concat([Buffer.from([0x04, digest.length]), digest]);
    const now = Date.now();
    const certificate = await x509.X509CertificateGenerator.createSelfSigned({
        serialNumber: serialNumber(),
        name: 'CN=ACME TLS-ALPN-01 challenge',
        notBefore: new Date(now - 3_600_000),
        notAfter: new Date(now + 7 * 86_400_000),
        keys,
        signingAlgorithm: EC_ALGORITHM,
        extensions: [new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: hostname }]), new x509.Extension(ACME_IDENTIFIER_OID, true, value)],
    });
    return { certificatePem: certificate.toString('pem'), keyPem: await privateKeyPem(keys.privateKey), notBefore: certificate.notBefore, notAfter: certificate.notAfter };
}

/**
 * A PKCS#10 certificate request (DER) for `hostname`: the name goes into the SAN only, because engine hostnames can
 * exceed the 64 characters a common name allows.
 *
 * @private App web origin
 */
export async function createCertificateRequest(hostname: string, keys: CryptoKeyPair): Promise<Uint8Array> {
    const request = await x509.Pkcs10CertificateRequestGenerator.create({ keys, signingAlgorithm: EC_ALGORITHM, extensions: [new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: hostname }])] });
    return new Uint8Array(request.rawData);
}

/**
 * Validity of the first certificate in a PEM chain.
 *
 * @private App web origin
 */
export function certificateValidity(pem: string): { readonly notBefore: Date; readonly notAfter: Date } {
    const certificate = new x509.X509Certificate(pem);
    return { notBefore: certificate.notBefore, notAfter: certificate.notAfter };
}

/**
 * A local certificate authority (the conformance build's development CA).
 *
 * @private App web origin
 */
export type LocalCa = {
    readonly certificatePem: string;
    readonly keys: CryptoKeyPair;
    readonly name: string;
};

/**
 * A new development CA valid for a year (basic constraints CA with path length 0, key usage keyCertSign and cRLSign).
 *
 * @private App web origin
 */
export async function createLocalCa(name: string): Promise<{ readonly ca: LocalCa; readonly keyPem: string }> {
    const keys = await generateTlsKeyPair();
    const now = Date.now();
    const certificate = await x509.X509CertificateGenerator.createSelfSigned({
        serialNumber: serialNumber(),
        name: `CN=${name}`,
        notBefore: new Date(now - 60_000),
        notAfter: new Date(now + 365 * 86_400_000),
        keys,
        signingAlgorithm: EC_ALGORITHM,
        extensions: [new x509.BasicConstraintsExtension(true, 0, true), new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true), await x509.SubjectKeyIdentifierExtension.create(keys.publicKey)],
    });
    return { ca: { certificatePem: certificate.toString('pem'), keys, name: `CN=${name}` }, keyPem: await privateKeyPem(keys.privateKey) };
}

/**
 * A leaf certificate for `hostname` signed by a local CA, valid for 7 days (EKU serverAuth, SAN only).
 *
 * @private App web origin
 */
export async function issueLocalLeaf(ca: LocalCa, hostname: string): Promise<TlsCredentials> {
    const keys = await generateTlsKeyPair();
    const now = Date.now();
    const certificate = await x509.X509CertificateGenerator.create({
        serialNumber: serialNumber(),
        subject: '',
        issuer: ca.name,
        notBefore: new Date(now - 60_000),
        notAfter: new Date(now + 7 * 86_400_000),
        publicKey: keys.publicKey,
        signingKey: ca.keys.privateKey,
        signingAlgorithm: EC_ALGORITHM,
        extensions: [
            new x509.BasicConstraintsExtension(false, undefined, true),
            new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
            new x509.ExtendedKeyUsageExtension([SERVER_AUTH_OID]),
            new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: hostname }], true),
            await x509.AuthorityKeyIdentifierExtension.create(ca.keys.publicKey),
        ],
    });
    return { certificatePem: `${certificate.toString('pem')}\n`, keyPem: await privateKeyPem(keys.privateKey), notBefore: certificate.notBefore, notAfter: certificate.notAfter };
}

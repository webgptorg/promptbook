import { describe, expect, it } from '@jest/globals';
import { isHostnameOnPrivateNetwork } from './isHostnameOnPrivateNetwork';

describe('isHostnameOnPrivateNetwork', () => {
    it('isHostnameOnPrivateNetwork returns false for local hostnames', () => {
        expect(isHostnameOnPrivateNetwork('localhost')).toBe(true);
        expect(isHostnameOnPrivateNetwork('a.localhost')).toBe(true);
        expect(isHostnameOnPrivateNetwork('foo.a.localhost')).toBe(true);
        expect(isHostnameOnPrivateNetwork('project.local')).toBe(true);
    });

    it('isHostnameOnPrivateNetwork returns false for public hostnames', () => {
        expect(isHostnameOnPrivateNetwork('collboard.com')).toBe(false);
        expect(isHostnameOnPrivateNetwork('collboard.localhost.com')).toBe(false);
        expect(isHostnameOnPrivateNetwork('localhost.false')).toBe(false);
        expect(isHostnameOnPrivateNetwork('foo.com')).toBe(false);
    });

    it('isHostnameOnPrivateNetwork returns true for private IP addresses', () => {
        expect(isHostnameOnPrivateNetwork('192.168.0.1')).toBe(true);
        expect(isHostnameOnPrivateNetwork('10.0.0.1')).toBe(true);
        expect(isHostnameOnPrivateNetwork('172.16.0.1')).toBe(true);
        expect(isHostnameOnPrivateNetwork('127.0.0.1')).toBe(true);
        expect(isHostnameOnPrivateNetwork('::1')).toBe(true);
    });

    it('isHostnameOnPrivateNetwork returns false for public IP addresses', () => {
        expect(isHostnameOnPrivateNetwork('8.8.8.8')).toBe(false);
        expect(isHostnameOnPrivateNetwork('1.1.1.1')).toBe(false);
    });
});

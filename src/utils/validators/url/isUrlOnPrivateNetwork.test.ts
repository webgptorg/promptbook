import { describe, expect, it } from '@jest/globals';
import { isUrlOnPrivateNetwork } from './isUrlOnPrivateNetwork';

describe('isUrlOnPrivateNetwork', () => {
    it('isUrlOnPrivateNetwork returns false for local hostnames', () => {
        expect(isUrlOnPrivateNetwork('http://localhost')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://a.localhost')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://foo.a.localhost')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://test.local/a/b/c')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://a.localhost/a/b/c')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://foo.a.localhost/a/b/c?foo=bar#anchor')).toBe(true);
    });

    it('isUrlOnPrivateNetwork returns false for public hostnames', () => {
        expect(isUrlOnPrivateNetwork('https://collboard.com')).toBe(false);
        expect(isUrlOnPrivateNetwork('https://collboard.localhost.com')).toBe(false);
        expect(isUrlOnPrivateNetwork('https://localhost.false')).toBe(false);
        expect(isUrlOnPrivateNetwork('https://foo.com')).toBe(false);
        expect(isUrlOnPrivateNetwork('https://webgpt.cz/')).toBe(false);
        expect(isUrlOnPrivateNetwork('https://webgpt.cz/a-vibrant-avian-2m2pfomf4woc')).toBe(false);
    });

    it('isUrlOnPrivateNetwork returns true for private IP addresses', () => {
        expect(isUrlOnPrivateNetwork('http://192.168.0.1')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://10.0.0.1')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://172.16.0.1')).toBe(true);
        expect(isUrlOnPrivateNetwork('http://127.0.0.1')).toBe(true);
    });

    it('isUrlOnPrivateNetwork returns false for public IP addresses', () => {
        expect(isUrlOnPrivateNetwork('http://8.8.8.8')).toBe(false);
        expect(isUrlOnPrivateNetwork('http://1.1.1.1')).toBe(false);
        expect(isUrlOnPrivateNetwork('http://237.11.2.63')).toBe(false);
    });
});

# App connection test certificates

A throwaway certificate authority and one leaf for the fake App dashboard and relays of `test/app-connection.test.mjs`. **Never trust them outside tests**: the CA's private key was discarded after signing, and the leaf's key is public here.

-   `ca.pem`: the test CA (`CN=ptbk test CA (never trust outside tests)`), passed to the client only as the tests' `tls.ca` or `NODE_EXTRA_CA_CERTS`.
-   `server.pem`, `server-key.pem` (PKCS#8): the leaf for `dashboard.localhost`, `relay-1.localhost` … `relay-3.localhost` and `localhost`, valid until 2126.

The client resolves every `*.localhost` name to 127.0.0.1 itself (RFC 6761), so the tests need no hosts file or DNS. They were generated once with OpenSSL (`req -x509` for the CA, `req` and `x509 -req` with `subjectAltName` for the leaf), so CI never needs OpenSSL.

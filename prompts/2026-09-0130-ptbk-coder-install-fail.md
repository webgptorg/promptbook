[ ]

[✨🐃] `npm install -g ptbk` fails on Node 26 (better-sqlite3 has no prebuilt binary and does not compile)

**Version:** `ptbk` 0.114.0-26, Node 26.7.0, macOS arm64, Xcode CLT present.

`better-sqlite3` (transitive dependency) falls back to `node-gyp rebuild` and fails:

```
./src/util/binder.lzz:40:37: error: no member named 'GetPrototype' in 'v8::Object'; did you mean 'GetPrototypeV2'?
./src/objects/database.lzz:416:89: error: no member named 'This' in 'v8::PropertyCallbackInfo<v8::Value>'
```

Works on Node 22.23.2. Either bump `better-sqlite3` to a release with Node 26 support, make it optional, or declare `engines.node` so npm warns early.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of installation of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

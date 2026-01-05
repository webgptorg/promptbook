<!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

# Audit (sub)dependencies

-   Author: [hejny](https://github.com/hejny)
-   Created at: 11/1/2024, 9:47:42 PM
-   Updated at: 11/1/2024, 9:47:42 PM
-   Labels:
-   Issue: #160

Audit (sub)dependencies to get rid of warnings during install.

```bash
$ npm i ptbk


npm WARN deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm WARN deprecated glob@8.1.0: Glob versions prior to v9 are no longer supported

added 97 packages, and audited 98 packages in 31s

23 packages are looking for funding
  run `npm fund` for details

6 low severity vulnerabilities

Some issues need review, and may require choosing
a different dependency.

Run `npm audit` for details.
```

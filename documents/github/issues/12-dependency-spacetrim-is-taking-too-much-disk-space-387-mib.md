            <!--⚠️ WARNING: This code has been generated so that any manual changes will be overwritten-->

            # Dependency "spacetrim" is taking too much disk space (38.7 MiB)

            - Author: [naruaway](https://github.com/naruaway)
            - Created at: 4/22/2024, 7:31:33 PM
            - Updated at: 6/26/2024, 7:55:35 PM
            - Labels:
            - Issue: #12

            Hi, thanks for maintaining this package. We realized that just installing `@promptbook/utils` suddenly uses `38.7 MiB` disk space due to https://github.com/hejny/spacetrim/pull/9. We would like `@promptbook/utils` to update `spacetrim` after https://github.com/hejny/spacetrim/pull/9 gets published since `@promptbook/utils@0.44.0-1` is used as a transitive dependency of `webdriverio`, which is a very popular package.

            - The latest `webdriverio` depends on `@wdio/utils@8.36.1`
            - `@wdio/utils@8.36.1` depends  on `locate-app@^2.1.0`
            - `locate-app@2.4.8` depends on `@promptbook/utils@0.44.0-1`

            So after updating `@promptbook/utils`, we also need to update `locate-app` package.

            I think we should close https://github.com/hejny/locate-app/issues/6 only after resolving this issue

            ## Comments

### Comment by hejny on 4/24/2024, 9:28:06 AM

Thank you for reporting this issue, now in new prerelease

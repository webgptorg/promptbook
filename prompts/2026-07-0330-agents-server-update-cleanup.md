[ ] !!

[✨🙇] Do the garbage-collecting of old versions of Agents server

-   On `/admin/update` of Agents server you can trigger the self-update of the server, the self-update process is working perfectly
-   But when there are lot of old stale versions the disk space can run out
-   Show all the version current and old in the `/admin/update` page and allow to delete old versions of Agents server manually
-   But also implement automatic garbage-collecting of old versions of Agents server, so that the disk space does not run out
-   Into the env variable `AGENTS_SERVER_GC_KEEP_VERSIONS` you can set how many versions to keep, the default is `3`, so that the current version and 2 old versions are kept, and all older versions are deleted automatically
-   This is relevant for both manual and auto update
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

```console
root@collboard-ptbk-live:/opt/promptbook-agents-server/bin# ls
10dbbe7  255c7bb  3ac6377  5d116d8  66ba539  e7bb647  ptbk
root@collboard-ptbk-live:/opt/promptbook-agents-server/bin# du -sh 10dbbe7
5.8G    10dbbe7
root@collboard-ptbk-live:/opt/promptbook-agents-server/bin# du -sh 255c7bb
5.9G    255c7bb
root@collboard-ptbk-live:/opt/promptbook-agents-server/bin# du -sh e7bb647
5.9G    e7bb647
```

```console
error: unable to write file design/onepager+wallpaper/generic-social-pavol.png
error: unable to write file design/onepager+wallpaper/generic-social.png
error: unable to write file design/onepager+wallpaper/linkedin-social-jirka.png
error: unable to write file design/onepager+wallpaper/linkedin-social-pavol.png
error: unable to write file design/onepager+wallpaper/linkedin-social.png
error: unable to write file design/onepager+wallpaper/og-image.png
error: unable to write file design/onepager+wallpaper/onepager-a4.png
error: unable to write file design/onepager+wallpaper/presentation-bg.png
fatal: cannot create directory at 'design/people': No space left on device
warning: Clone succeeded, but checkout[promptbook-vps] Publishing Agents Server Next static assets to /opt/promptbook-agents-server/.promptbook/next-static/_next/static.
[promptbook-vps] Installing Promptbook from https://github.com/webgptorg/promptbook.git (main) into /opt/promptbook-agents-server/bin/ec78baf.
[promptbook-vps] Branch-based shallow clone failed; cloning full history to check out arbitrary ref main.
Cloning into '/opt/promptbook-agents-server/bin/.install--1483'...
fatal: write error: No space left on device
fatal: fetch-pack: invalid index-pack output
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - heading "500 / Internal Server Error" [level=1] [ref=e4]
  - paragraph [ref=e5]: A server exception occurred while loading Promptbook Agents Server.
  - paragraph [ref=e6]: An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error. - the server for Promptbook Agents Server logged this failure.
  - generic [ref=e7]:
    - generic [ref=e8]:
      - button "Try again" [ref=e9] [cursor=pointer]
      - link "Go to homepage" [ref=e10] [cursor=pointer]:
        - /url: /
      - button "Copy" [ref=e11] [cursor=pointer]
      - button "Save" [ref=e12] [cursor=pointer]
    - generic [ref=e13]: "Digest: 4106448126"
  - generic [ref=e14]:
    - article [ref=e15]:
      - paragraph [ref=e16]: Refresh the route
      - paragraph [ref=e17]: Use the primary action so the page can retry with fresh cookies, network state, and build assets.
    - article [ref=e18]:
      - paragraph [ref=e19]: Share the digest
      - paragraph [ref=e20]: Copy or save the markdown report before reporting the problem so operators can match logs quickly.
    - article [ref=e21]:
      - paragraph [ref=e22]: Check the system status
      - paragraph [ref=e23]: If the issue keeps happening, contact your admin or hosting team so they can inspect the server logs.
  - paragraph [ref=e24]: Our team already receives this report in Sentry, but feel free to include the digest when reporting the issue so the logs can be correlated quickly.
```
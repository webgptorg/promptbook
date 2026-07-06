# User Interface Navigation

The Agents Server UI is organized around the current server, agent organization, selected agent, and administrative/system pages.

## Main Menu

The main menu has three conceptual sections.

Navigation hierarchy:

- Server icon and server name, for example `Promptbook Agents Server`.
- `>` and `Agents` or the selected agent name.
- `>` and the selected view, such as `Profile`, `Chat`, or `Book`, when an agent view is active.

Menu items:

- Documentation
- System

Control panel and user menu:

- Control panel
- User menu with avatar and user name

## Homepage

The homepage shows the agent organization for the current logical server.

Supported presentation modes may include:

- list
- graph
- office
- maze
- pixel office

Folders and agents are organized by folder hierarchy. Hidden folders whose name starts with `.` are hidden by default, with an administrator toggle when hidden content exists.

Administrators and signed-in users with organization permission can create, import, export, move, clone, and delete agents according to route permissions.

## Agent Views

Agent pages include:

- Profile: public-facing profile and metadata.
- Chat: interactive chat.
- Book: source editor.
- Book + Chat: editor and chat side by side.
- History: source history.
- Integration: API and embed integration details.
- Website Integration: website-specific embed guidance.
- Iframe: embeddable view.
- Images: avatar/testing images.
- Links: generated URLs.
- Share Target: PWA share flow.
- System Message: resolved system/debug view.
- Textarea: simplified input view.
- Timeouts: scheduled chat timeout controls.
- Export as Transpiled Code: code export view.

Private, owner-only, and admin-only controls MUST be hidden or disabled when the current user cannot perform the action. Server-side APIs MUST still enforce authorization.

## Admin Views

Admin pages include:

- dashboard/control panel
- metadata
- limits
- users
- API tokens
- servers
- logs
- backups
- update
- task manager
- code runners
- custom CSS and JavaScript
- Shibboleth settings
- GitHub and calendar setup

See [Admin](../admin.md).

## Documentation and System

Documentation pages expose server and book-language documentation. System pages expose diagnostics and utilities, including mocked-chat tooling where available.

System utilities that are intended for diagnostics MUST remain separate from normal agent chat flows.


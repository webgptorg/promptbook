[ ]

[✨♞] Add support for `messageDraft` in the chat messages

- Keep the functionality of both `message` and `messageDraft` 
- The `messageDraft` will be used to create a draft message that can be edited before sending in the chat interface. The `message` will be used to send a message directly without editing.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

```book
Copywriter

INITIAL MESSAGE

Ahoj,
napíšu ti text ve firemním tónu pro web, email, kampaň nebo produkt.

Dokážu připravit slogan, homepage text, CTA i několik variant stejného sdělení pro různé publikum.

[Více](?message=Napiš mi víc o sobě)
[Napiš claim](?messageDraft=Navrhni mi 5 variant claimu pro službu, která firmám zavádí AI asistenty.)
[Landing page](?messageDraft=Napiš hero sekci landing page pro AI asistenta pro HR onboarding.)
[Email po demu](?messageDraft=Napiš krátký follow-up email po produktovém demu pro operations manažera.)


CLOSED

```

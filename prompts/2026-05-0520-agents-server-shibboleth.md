[x] ~$1.55 an hour by OpenAI Codex `gpt-5.5`

[✨🐡] Add logging of Shibboleth authentication process in the Agents Server

-   Activating Shibboleth authentication (and in future other login methods) in the Agents Server should be done via metadata configuration `IS_SHIBBOLETH_AUTH_ACTIVE`
-   By default, the Shibboleth authentication is not active
-   When the Shibboleth authentication is active, it should live alongside the standard username/password authentication, so the users can choose which method they want to use to log in
-   When the shibboleth authentication is active, in the menu should appear "System" -> "Login Methods" -> "Shibboleth" there should be a dashboard with the Shibboleth authentication
-   In the dashboard There should be:
    -   Setup instructions for the Shibboleth authentication for admin
        -   If the Shibboleth authentication is active BUT not configured correctly, there should be a warning notification alongside the menu item (in all levels + in the dashboard) that the Shibboleth authentication is active but not configured correctly, and there should be a link to the setup instructions in the notification, so the admin can easily find out how to set it up correctly
    -   log of all the authentication attempts via Shibboleth
    -   All others information related to the Shibboleth authentication
    -   All the users that registered / logged in via Shibboleth and their details (like email, display name, etc.)
-   When Shibboleth authentication is NOT active, the "System" -> "Login Methods" -> "Shibboleth" should not be in the menu
-   For each shibboleth user create a user in the database with the same email and display name as the one provided by the Shibboleth authentication, so it is possible to manage the shibboleth users from the same place as the normal users in the Agents Server, theese users are linked and can be passwordless, so they can only log in via Shibboleth, but they are still users in the database and can be managed from the same place as the normal users
-   Theese users are also visible through `/admin/users`
-   Interlink `/admin/users` and the Shibboleth dashboard, look how metadata and limits are interlinked
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

**This is the context of what you need to do:**

-   Find additional documentation and instructions on the internet

```mail
>
> > Dobrý den,
> > přihlašovací stránku do aplikace pro "využití AI při podávání projektových
> > žádostí" bychom chtěli řešit pomocí Shibboleth-u, který už využíváme u
> > jiných externích aplikací provozovaných i na SU nebo u jiných provozovatelů.
> >
> > U nás to např. máme implementováno u docházkové aplikace evido.slu.cz
> > nebo u CESNETí aplikace pro nahrávání velkých souborů filesender.cesnet.cz,
> > do kterých se mohou naši SU uživatelé přihlásit přes eduID pomocí běžných
> > CRO uživatelských jmen/hesel.
> >
> > Na stránkách CESNETu jsou k tomu návody:
> > https://www.eduid.cz/cs/tech/howto/sources
> > https://www.eduid.cz/cs/tech/howto/apps
> >
> > Zřejmě to bude vyžadovat, abyste si do své aplikace integrovali
> > přihlašování přes Shibboleth a na straně SU budeme muset také provést
> > nějaká nastavení, aby to fungovalo správně.
> >
> > Dejte, prosím, vědět, jakmile budete mít na vaší straně nastaveno
> > připojení a co budete potřebovat ze strany SU, abychom nastavili my.
> >
> > S pozdravem
> > Petr Korviny
> >
> > --
> > --
> > Kontakt:
> > --------------------------
> > Ing. Petr Korviny, Ph.D.
> > --------------------------
> > Slezská univerzita v Opavě
> > Centrum informačních technologií
> > Na Rybníčku 626/1
> > 746 01 Opava
> > --------------------------
> > tel.: +420 553 68 4647, +420 596 39 8299
> > e-mail: petr.korviny@slu.cz
> > --------------------------
> >
Jakub Jezisek <jezisek@opf.slu.cz>	25. května 2026 v 8:42
Komu: Jiří Jahn <jiri@ptbk.io>
Kopie: Pavol Hejný <pavol@ptbk.io>, David Jančar <jancar@opf.slu.cz>, Petr Korviny <petr.korviny@slu.cz>, Martin Tichý <martin.tichy@slu.cz>
Dobrý den,

za mě může být.
[Citovaný text byl skryt]
--
Ing. Jakub Jezisek
Head of Department
Department of Information Technologies
Silesian University in Opava, School of Business Administration in Karvina, Czechia

phone: +420 596 398 327 | e-mail: jezisek@opf.slu.cz

Silesian University is a proud member of the STARS EU alliance.
https://www.slu.cz/opf/en/
https://starseu.org/

Jiří Jahn <jiri@ptbk.io>	25. května 2026 v 9:01
Komu: Jakub Jezisek <jezisek@opf.slu.cz>
Kopie: Pavol Hejný <pavol@ptbk.io>, David Jančar <jancar@opf.slu.cz>, Petr Korviny <petr.korviny@slu.cz>, Martin Tichý <martin.tichy@slu.cz>
Děkuji, poslal jsem pozvánku na `jezisek(at)opf.slu.cz`

JJ

po 25. 5. 2026 v 8:42 odesílatel Jakub Jezisek <jezisek@opf.slu.cz> napsal:
[Citovaný text byl skryt]
Jakub Jezisek <jezisek@opf.slu.cz>	27. května 2026 v 12:27
Komu: Jiří Jahn <jiri@ptbk.io>, Pavol Hejný <pavol@ptbk.io>
Kopie: Petr Korviny <petr.korviny@slu.cz>
Zdravím,

navazuji na náš včerejší hovor ohledně integrace ověřování uživatelů pro vaši AI aplikaci. Jak jsme se domluvili, prozatím odložíme registraci do celonárodní federace eduID.cz a propojíme naši univerzitu (Identity Provider) s vaší aplikací (Service Provider) napřímo (bilaterálně).

Abychom mohli propojení na našem Shibboleth IdP nakonfigurovat, potřebujeme od vašeho technického týmu buď XML soubor s metadatay vašeho SP, nebo alespoň dva základní konfigurační parametry:

EntityID: Unikátní identifikátor vaší aplikace (zpravidla URL adresa aplikace, např. https://promptbook.cz/shibboleth).

Assertion Consumer Service (ACS) URL: Endpoint na vaší straně, kam náš server bezpečně přesměruje uživatele po úspěšném přihlášení (např. https://promptbook.cz/saml2/idpresponse).

Netuším, v čem je vaše platforma programovaná a jaké máte možnosti integrace knihoven pro SAML protokol, proto pro vaši inspiraci přikládám vzor minimálního funkčního XML metadat, které u nás na serveru používáme pro integraci s Amazon Cognito (služba Evido).

Pro vaši inspiraci přikládám vzor minimálního funkčního XML metadat, které u nás na serveru používáme pro integraci s Amazon Cognito (služba Evido). Pokud váš systém umí metadata vygenerovat, klidně nám pošlete vlastní. Pokud ne, stačí, když vaši vývojáři přepíší hodnoty entityID a Location v této šabloně a pošlou nám ji zpět.

příklad pro evido:

<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="urn:amazon:cognito:sp:eu-central-1_Fwtc2Lc6D">
    <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
        <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://testslu.auth.eu-central-1.amazoncognito.com/saml2/idpresponse"/>
    </md:SPSSODescriptor>
</md:EntityDescriptor>

Co získáte od nás (Konfigurace na vaší straně)
Na vaší straně si do SAML modulu naimportujte metadata naší univerzity. Najdete je trvale na této adrese: https://idp-cro.slu.cz/idp/shibboleth (Platnost našich podpisových a šifrovacích certifikátů v metadatech je bezpečně nastavena až do roku 2037). Takže i když změníme verzi Shibbolethu, nic se nezmění u vás do té doby.

Po úspěšném přihlášení uživatele bude náš Shibboleth vaší aplikaci standardně předávat následující atributy uživatele (uživatelský profil):

displayName (Zobrazované celé jméno uživatele)

mail (E-mailová adresa v rámci univerzity)

unstructuredName (Interní identifikátor, případně můžeme po dohodě přepnout na standardní akademické ID eduPersonPrincipalName).

Užitečné technické odkazy pro vývojáře
Pokud by vaši technici potřebovali detailnější specifikaci atributů nebo obecný přehled o fungování těchto vazeb v českém akademickém prostředí, doporučuji technickou dokumentaci eduID.cz:

Přehled používaných atributů: https://www.eduid.cz/cs/tech/attributes

Příručka pro správce Service Providerů: https://www.eduid.cz/cs/tech/sp

Jakmile mi pošlete vaše údaje/metadata, zavedu je k nám na testovací prostředí.



Přístup

Než abychom složitě vytvářeli nový externí přístup „na zelené louce“, zjistil jsem, že jste u nás na SU veden jako bývalý student a zaměstnanec. Obnovil jsem tedy Vaši původní identitu jah0009 s rolí externisty, a to s platností do října 2026.

Účet by měl fungovat s Vaším původním heslem. Pokud si ho již nepamatujete, můžete si ho resetovat přes univerzitní CRO na adrese https://moje.slu.cz (v systému máte pro tyto účely zaregistrované své mobilní číslo).

Účet jsem již úspěšně otestoval – přes tuto identitu se bez problému přihlásím jak do systému Evido (evido.slu.cz), tak do federovaných služeb CESNETu (např. FileSender.cesnet.cz). Zároveň jsem u této identity změnil kontaktní e-mail z Matematického ústavu na univerzální dostupný na mail.slu.cz, pro případ, že by bylo třeba řešit mailem nebo pro systémové zprávy.

V případě jakýchkoliv technických dotazů mě neváhejte kontaktovat přímo.

S pozdravem,
[Citovaný text byl skryt]
```


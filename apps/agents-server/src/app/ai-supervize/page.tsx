import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'AI Supervize | AI Web',
    description:
        'AI Supervize pro ceske vyvojove tymy: workflow, pravidla, playbook, sablony a metriky pro bezpecne a opakovatelne vyuziti AI.',
    alternates: {
        canonical: '/ai-supervize',
    },
    openGraph: {
        title: 'AI Supervize',
        description:
            'Prakticky program pro CTO, CEO a Tech Leady: rozhodnuti + plan + playbook + sablony + meritelne metriky.',
        type: 'website',
    },
};

type SectionList = ReadonlyArray<string>;

const targetRoles: SectionList = [
    'CTO, CEO nebo Tech Lead vyvojoveho tymu',
    'Firma s vlastni codebase a tymem, ktery pravidelne dodava zmeny',
    'Typicky Full-Stack / TypeScript / JavaScript / Next.js (prizpusobime se i jinemu stacku)',
];

const symptoms: SectionList = [
    'Nechceme poustet kod ven / bojime se o citliva data.',
    'Nevime, kde zacit a co je pro nas relevantni.',
    'AI generuje hodne kodu, ale kvalita kolisa a review boli.',
    'PRka jsou velka, tezko se kontroluji, casto se to vraci.',
    'Kazdy pouziva jiny nastroj, nikdo nevi, kdy co pouzit.',
    'Dokumentace je slaba, AI nerozumi projektu a navrhy jsou mimo.',
    'AI nekdy pomaha a nekdy rozbije cely den.',
];

const deliverables: ReadonlyArray<{ title: string; items: SectionList }> = [
    {
        title: '1) AI Adoption Plan (Start / Scale)',
        items: [
            'Doporuceni, zda a jak AI zavest (nebo proc zatim ne)',
            'Prioritizovane use-casy: rychle vyhry vs. systemove kroky',
            'Rozhodnuti pro tooling, modely a rezim dat ve vasem kontextu',
        ],
    },
    {
        title: '2) AI Development Playbook (PDF / Notion / MD do repa)',
        items: [
            'Workflow od pozadavku po merge s AI asistenci',
            'Pravidla: kdy delegovat, co kontrolovat a co zakazat',
            'Definition of Done pro AI-pomahane zmeny',
            'Doporuceny proces code review vcetne AI asistence',
        ],
    },
    {
        title: '3) Tool & Model Matrix (PDF / Notion / MD do repa)',
        items: [
            'Ktery nastroj a model na kterou ulohu (architektura, testy, debug, dokumentace...)',
            'Jasna pravidla co je povolene, zakazane a jak zachazet s citlivymi daty',
            'Doporuceni s ohledem na naklady',
        ],
    },
    {
        title: '4) Repo & PR sablony (PDF / Notion / MD do repa)',
        items: [
            'Sablony pro issues, PRD, PR a commit messages',
            'Checklisty pro review a release',
            'Doporucena branch strategie podle reality tymu',
        ],
    },
    {
        title: '5) Implementacni plan na 30/60/90 dni (PDF / Notion / MD do repa)',
        items: [
            'Konkretni backlog polozky + priorita + ocekavany dopad',
            'Metriky: lead time, doba review, reopen rate, incident rate',
            'Co merit a jak poznat, ze zavedeni funguje',
        ],
    },
];

const practicalAreas: SectionList = [
    'AI coding nastroje: Codex, Claude Code, Copilot, Cline, Codeium, Cursor...',
    'Modely: vyber vhodneho modelu na konkretni typ prace',
    'Editory a prostredi: VS Code / JetBrains / AI IDE, nastaveni a bezpecnost',
    'Git a zmenovy workflow: worktree, bisect, branch strategie, velikost PR, review flow',
    'Code observability a AI debugging',
    'Dokumentace pro AI-readiness repa',
    'PRD -> Issue -> PR pipeline',
    'Logging, error handling a CI/CD zapojeni AI',
];

const pricingPackages: ReadonlyArray<{ title: string; price: string; details: SectionList; note?: string }> = [
    {
        title: 'Discovery workshop (2-3 h)',
        price: '5 000 Kc',
        details: [
            'Pokud zjistime, ze AI Supervize pro vas neni vhodna, neuctujeme nic.',
            'Pri pokracovani castku zapocteme do balicku AI Supervize.',
        ],
    },
    {
        title: 'AI Supervize (navrh + nastaveni + vystupy)',
        price: '80 000 Kc',
        details: [
            'Discovery (pokud nebyl zvlast fakturovan)',
            'Adoption Plan + Playbook + Matrix + sablony + 30/60/90 plan',
            'Workshop nad vysledky + doladeni',
            'Kratka async podpora behem zavadeni',
        ],
    },
    {
        title: 'Follow-up (mesicni rezim)',
        price: '15 000 Kc / mesic',
        details: [
            '1x mesicni review (60-90 min)',
            'Prubezne konzultace v domluvenem kanalu',
            'Upravy playbooku a sablon podle reality',
        ],
        note: 'Zatim nejsme platci DPH, cena je konecna.',
    },
];

function BulletList({ items }: { items: SectionList }) {
    return (
        <ul className="space-y-2 text-slate-700">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

export default function AiSupervizePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-cyan-50">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="mx-auto max-w-6xl space-y-8">
                    <header className="rounded-2xl border border-cyan-100 bg-white/90 p-6 shadow-sm md:p-10">
                        <div className="mb-4 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                            Program pro ceske vyvojove firmy
                        </div>
                        <h1 className="font-poppins text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                            AI Supervize
                        </h1>
                        <p className="mt-4 max-w-4xl text-lg text-slate-700">
                            At uz AI v tymu pouzivate naplno, jen obcas, nebo vubec, AI Supervize vam pomuze udelat z AI
                            kontrolovany vykon, ne nahodnou loterii.
                        </p>
                        <p className="mt-4 max-w-4xl text-slate-700">
                            Vysledek neni prednaska o AI. Vysledek je rozhodnuti + plan + playbook + sablony + meritelne
                            metriky pro vas konkretni produkt a tym.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <a
                                href="mailto:jiri@ptbk.io"
                                className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                                Domluvit uvodni schuzku
                            </a>
                            <a
                                href="mailto:pavol@ptbk.io"
                                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
                            >
                                Napsat dotaz
                            </a>
                            <Link
                                href="/"
                                className="rounded-lg border border-transparent px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-200 hover:text-slate-900"
                            >
                                Zpet na uvodni stranku
                            </Link>
                        </div>
                    </header>

                    <section className="grid gap-6 md:grid-cols-2">
                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-poppins text-2xl font-semibold text-slate-900">Pro koho je AI Supervize</h2>
                            <div className="mt-4">
                                <BulletList items={targetRoles} />
                            </div>
                            <p className="mt-4 text-slate-700">
                                Pomahame tymum jit z AI nepouzivame -> bezpecny start a jasna pravidla, nebo z AI
                                pouzivame ad-hoc -> systematicky vykon.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-poppins text-2xl font-semibold text-slate-900">Typicke symptomy</h2>
                            <div className="mt-4">
                                <BulletList items={symptoms} />
                            </div>
                        </article>
                    </section>

                    <section className="grid gap-6 md:grid-cols-2">
                        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
                            <h3 className="font-poppins text-xl font-semibold text-emerald-900">
                                A) AI zatim nepouzivate / nejste si jisti
                            </h3>
                            <div className="mt-4">
                                <BulletList
                                    items={[
                                        'Vyber use-casu s nejvyssim dopadem',
                                        'Nastaveni bezpecnosti a pravidel pro data',
                                        'Vyber nastroju a modelu s rozumnymi naklady',
                                        'Priprava prvniho mesice: proces, sablony, mereni, onboarding',
                                    ]}
                                />
                            </div>
                            <p className="mt-4 text-sm font-medium text-emerald-900">
                                Cil: rychly start bez prusvihu a jasne dalsi kroky.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6">
                            <h3 className="font-poppins text-xl font-semibold text-blue-900">
                                B) AI pouzivate, ale vysledky kolisaji
                            </h3>
                            <div className="mt-4">
                                <BulletList
                                    items={[
                                        'Sjednoceni workflow a review',
                                        'Snizeni reworku a regresnich chyb',
                                        'Zlepseni dokumentace a AI-readiness repa',
                                        'Nastaveni mereni dopadu: co funguje a co je placebo',
                                    ]}
                                />
                            </div>
                            <p className="mt-4 text-sm font-medium text-blue-900">
                                Cil: mene chaosu, vice vykonu, stabilne a dlouhodobe.
                            </p>
                        </article>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="font-poppins text-2xl font-semibold text-slate-900">Co dostanete</h2>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            {deliverables.map((deliverable) => (
                                <article key={deliverable.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="font-semibold text-slate-900">{deliverable.title}</h3>
                                    <div className="mt-3">
                                        <BulletList items={deliverable.items} />
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="grid gap-6 md:grid-cols-3">
                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
                            <h2 className="font-poppins text-2xl font-semibold text-slate-900">Jak Supervize probiha</h2>
                            <div className="mt-5 space-y-4 text-slate-700">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="font-semibold text-slate-900">1) Discovery workshop (2-3 h online)</h3>
                                    <p className="mt-2">
                                        S CTO/Tech Leadem projdeme aktualni workflow, cile, omezeni i use-casy, kde AI
                                        dava smysl nebo naopak nedava.
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-slate-900">
                                        Vystup: shrnuti + doporuceni dalsiho postupu.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="font-semibold text-slate-900">2) Navrh a nastaveni</h3>
                                    <p className="mt-2">
                                        Dodame Adoption Plan, Playbook, Tool & Model Matrix, repo/PR sablony i plan na
                                        30/60/90 dni a vse doladime podle reality tymu.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h3 className="font-semibold text-slate-900">3) Mesicni follow-up</h3>
                                    <p className="mt-2">
                                        Vyhodnocujeme metriky, upravujeme pravidla a pomahame se zavadenim i evaluaci
                                        novych nastroju.
                                    </p>
                                </div>
                            </div>
                        </article>

                        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-poppins text-xl font-semibold text-slate-900">Bezpecnost a duvernost</h2>
                            <div className="mt-4">
                                <BulletList
                                    items={[
                                        'Standardne pracujeme pod NDA.',
                                        'Predem nastavime pravidla pro data (co smi do AI a co ne).',
                                        'Navrhneme i workflow pro vyssi naroky: redakce dat, izolace, interni modely.',
                                    ]}
                                />
                            </div>
                        </aside>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="font-poppins text-2xl font-semibold text-slate-900">
                            Na co se u vas konkretne podivame
                        </h2>
                        <div className="mt-4">
                            <BulletList items={practicalAreas} />
                        </div>
                    </section>

                    <section className="grid gap-6 md:grid-cols-2">
                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-poppins text-2xl font-semibold text-slate-900">Kdo vas provede</h2>
                            <p className="mt-3 text-slate-700">
                                Jsme AI Web s.r.o. a vyvijime produkt Promptbook. AI pouzivame denne v realnem vyvoji i v
                                realnem nasazovani.
                            </p>
                            <div className="mt-5 space-y-4 text-slate-700">
                                <div>
                                    <p className="font-semibold text-slate-900">Jiri Jahn</p>
                                    <p>Ph.D. in Mathematics, former researcher at IT4I National Supercomputing Centre</p>
                                    <p>
                                        <a className="text-cyan-700 hover:underline" href="mailto:jiri@ptbk.io">
                                            jiri@ptbk.io
                                        </a>{' '}
                                        |{' '}
                                        <a className="text-cyan-700 hover:underline" href="tel:+420777090067">
                                            +420 777 090 067
                                        </a>
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Pavol Hejny</p>
                                    <p>Developer (15+ let praxe), aktivni open-source contributor</p>
                                    <p>
                                        <a className="text-cyan-700 hover:underline" href="mailto:pavol@ptbk.io">
                                            pavol@ptbk.io
                                        </a>{' '}
                                        |{' '}
                                        <a className="text-cyan-700 hover:underline" href="tel:+420777759767">
                                            +420 777 759 767
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </article>

                        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="font-poppins text-2xl font-semibold text-slate-900">Cena</h2>
                            <div className="mt-4 space-y-4">
                                {pricingPackages.map((pkg) => (
                                    <section key={pkg.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="font-semibold text-slate-900">{pkg.title}</h3>
                                            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                                                {pkg.price}
                                            </span>
                                        </div>
                                        <div className="mt-3">
                                            <BulletList items={pkg.details} />
                                        </div>
                                        {pkg.note && <p className="mt-3 text-sm text-slate-600">{pkg.note}</p>}
                                    </section>
                                ))}
                            </div>
                        </article>
                    </section>

                    <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 text-center shadow-sm">
                        <h2 className="font-poppins text-2xl font-semibold text-slate-900">Jak zacit</h2>
                        <p className="mx-auto mt-3 max-w-3xl text-slate-700">
                            Napiste nam na jiri@ptbk.io nebo pavol@ptbk.io a domluvime si uvodni schuzku. Behem 2-3 hodin
                            budete vedet, jestli vam AI Supervize prinese hodnotu a jaky bude dalsi krok.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                            <a
                                href="mailto:jiri@ptbk.io"
                                className="rounded-lg bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
                            >
                                Napsat Jirimu
                            </a>
                            <a
                                href="mailto:pavol@ptbk.io"
                                className="rounded-lg border border-cyan-300 bg-white px-5 py-3 text-sm font-semibold text-cyan-800 transition hover:border-cyan-400"
                            >
                                Napsat Pavolovi
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

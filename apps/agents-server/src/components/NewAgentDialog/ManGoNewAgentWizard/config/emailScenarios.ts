/** Sample customer emails for the Test step's email run — clicking one prefills the input. */
export type EmailScenario = {
    readonly id: string;
    readonly label: string;
    readonly icon: string;
    readonly email: string;
};

export const EMAIL_SCENARIOS: readonly EmailScenario[] = [
    {
        id: 'reklamace',
        label: 'Reklamace poškozeného zboží',
        icon: '📦',
        email: 'Dobrý den, objednané zboží (obj. č. 2206114521) mi dorazilo poškozené — rozbitý displej. Chci ho reklamovat, jak mám postupovat? Děkuji, Nováková',
    },
    {
        id: 'nedorucena',
        label: 'Nedoručená zásilka',
        icon: '🚚',
        email: 'Dobrý den, před 3 dny jsem objednal zboží (obj. č. 2206114521) a stále mi nedorazilo. Kdy ho mohu čekat? Děkuji, Novák',
    },
];

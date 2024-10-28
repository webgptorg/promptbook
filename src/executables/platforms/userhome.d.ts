declare module 'userhome' {
    export default function userhome(path: string): string;
    interface Clickable {
        onClick(): void;
    }
}

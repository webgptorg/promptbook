# Git synchronizace

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Pull/push jsou samostatné outcomes. Chybějící remote, divergence, conflict, authentication a network failure se nepletou s výsledkem implementace. Lokální dokončení s odmítnutým push zůstává lokálně dokončené a synchronizace pending; nevolat kvůli němu znovu model.

Zapnutý auto-pull provádí standardní `git pull --rebase` před obnovením fronty mezi koly, při zachování vlastnických guardů a bez autostashe. V izolaci se nikdy nepushuje dočasná větev; push směřuje pouze z původní větve po úspěšné integraci. Pull konflikt zastaví další nebezpečné mutace a zachová stav k ručnímu rozřešení.

## Související specifikace

- [Vlastnictví změn a Git persistence](git-persistence.md)
- [Izolace tasku ve worktree](isolation.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Traces a výsledky](traces.md)

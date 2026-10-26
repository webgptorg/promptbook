# Known, intentionally deferred limitations

[Main specification](../_main.md) · [Concurrent work](concurrency.md)

These limitations are acknowledged target-behavior boundaries, not forgotten requirements or instructions to implement a remedy in this version.

- **File-lock deadlocks:** concurrent operations can wait cyclically for files held by one another. Keep the actual blockers and recoverable work visible; detection/prevention/cycle-breaking is deferred. Task-dependency cycles remain invalid under ordinary eligibility rules.

- **Shared browser-session/account interference:** projects connected to one profile share cookies and authentication. Login/logout/account changes in one project can affect another. Reuse an already signed-in session; Wallet is invoked only for missing authentication. Automatic cross-project account isolation/switching and related safeguards are deliberately deferred; do not require separate profiles as a remedy in this version.

An affected operation waiting does not itself pause or stop the whole engine. Continue safe independent work and retain controls under the ordinary lifecycle rules.

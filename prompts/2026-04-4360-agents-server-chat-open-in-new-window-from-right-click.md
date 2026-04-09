[x] ~$0.00 14 minutes by GitHub Copilot `claude-sonnet-4.6`

---

[ ]

[🎯🪟] Allow opening a new chat window via right-click browser-native context menu

-   You are working with [Agents Server](apps/agents-server)
-   New chat icon should be link that opens `.../chat?chat=new` and the navigation on this url itself should trigger the new chat creation, this will allow users to right click and open in new window from the browser-native context menu
-   Navigating to `.../chat?chat=new` should lead to new char, for example https://pavol-hejny.ptbk.io/agents/JrMi6YxWeLvjoK/chat?chat=new
-   Also New chat button in the Chat component should also be a link that opens `.../chat?chat=new` to be consistent and allow right click and open in new window from the browser-native context menu
-   Do a proper analysis of the current functionality before you start implementing.

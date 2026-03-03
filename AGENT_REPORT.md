# Agent Report

- Critical issue observed during `npm run test-app-agents-server`: server logs repeatedly show `ReferenceError: window is not defined` while rendering `/agents/[agentName]/system-message` (stack points into `.next/server/chunks/6369.js` and `app/agents/[agentName]/system-message/page.js`). This issue is unrelated to the arrow-unification task and was not modified here.
- Critical issue observed again during `npm run test-app-agents-server`: server logs repeatedly show `ReferenceError: window is not defined` while rendering `/agents/[agentName]/website-integration` (stack points into `.next/server/chunks/6369.js` and `app/agents/[agentName]/website-integration/page.js`). This issue is unrelated to the chat synchronization task and was not modified here.

# Loading UI Guideline

- Use a **skeleton** when the user is waiting for a full route or a large layout section, and the final structure is known (profile hero, chat thread, list rows/cards, graph container).
- Use a **spinner** for small/local actions where structure is already visible (buttons, inline refresh indicators, compact status chips).
- Use **optimistic UI** when user intent can be applied immediately with low rollback risk (append local item/message first, then reconcile with server response).

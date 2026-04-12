On the `main`:

```bash
git checkout -b backup/failed-xxx
```

---

Manually checkout (supposed) working commit

---

```bash
git branch -D main

git checkout -b main

git push --set-upstream origin main --force

```

---

Cherry pick work from the `backup/failed-xxx` which should be preserved

---

You can commit anytime to `/nonce` to trigger result

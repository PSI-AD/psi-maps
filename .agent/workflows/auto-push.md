---
description: Auto-push to GitHub after every code change
---

# Auto-Push to GitHub

After EVERY code change (edit, create, or delete files), automatically push to GitHub.

## Steps

// turbo-all

1. Stage all changes:
```bash
cd "/Users/admin/PSI Projects/psi-maps" && git add -A
```

2. Commit with a descriptive message summarizing the changes:
```bash
cd "/Users/admin/PSI Projects/psi-maps" && git commit -m "<descriptive message>"
```

3. Push to GitHub:
```bash
cd "/Users/admin/PSI Projects/psi-maps" && git push
```

## Important Notes

- Do NOT deploy to Firebase — GitHub Actions handles deployment automatically
- Always push after completing a set of related changes
- Use clear, descriptive commit messages

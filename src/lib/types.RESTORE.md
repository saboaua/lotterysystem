# Restore types.ts

If `src/lib/types.ts` was corrupted during branding push, restore with:

```bash
git checkout 9a17de9859831a82202e9bfb93d65253b1814a3d -- src/lib/types.ts
```

Then add to `BrandSettings`:

```ts
theme_id?: string;
login_welcome?: string;
login_subtitle?: string;
```

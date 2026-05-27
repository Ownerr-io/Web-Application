# Local verification (no CI)

During active development there is **no GitHub Actions** pipeline. Run checks locally before tagging a release or opening a PR.

## Primary app (`artifacts/ownerr-web-app`)

From that directory:

```bash
npm install   # once, or from repo root: npm install
npm run typecheck
npm run lint
npm run build
```

Auto-fix lint where safe:

```bash
npm run lint:fix
```

## Monorepo (repo root)

From the repository root, typecheck and build cover shared libs and workspaces:

```bash
npm install
npm run typecheck
npm run build
```

Lint is defined on the web app workspace:

```bash
npm run lint --workspace=@workspace/ownerr-web-app
```

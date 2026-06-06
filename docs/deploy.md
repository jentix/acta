# Deploy Acta

Acta can generate GitHub Actions workflows that publish the static web viewer
from a user repository. The generated workflows build `.acta/site` with the
published `@acta-dev/cli` package, then deploy that directory to a static host.

## GitHub Pages

Create the workflow:

```sh
acta init --deploy=pages
```

This writes `.github/workflows/acta-deploy-pages.yml`. On pushes to `main`, the
workflow:

1. Checks out the repository.
2. Installs pnpm and Node.js.
3. Runs `pnpm dlx @acta-dev/cli site --base "/${{ github.event.repository.name }}"`.
4. Uploads `.acta/site` with `actions/upload-pages-artifact`.
5. Deploys with `actions/deploy-pages`.

In the repository settings, enable GitHub Pages with **Source: GitHub Actions**.
The workflow already declares the required `contents`, `pages`, and `id-token`
permissions.

For organization or user pages hosted at the domain root, edit the generated
workflow and remove the `--base "/${{ github.event.repository.name }}"` flag.

## Other Static Hosts

These providers are scaffolded with the same build step:

```sh
pnpm dlx @acta-dev/cli site
```

The deploy step needs provider-specific secrets or repository variables:

| Provider | Command | Required settings |
|---|---|---|
| Cloudflare Pages | `acta init --deploy=cloudflare` | Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; variable: `CLOUDFLARE_PROJECT_NAME`. |
| Vercel | `acta init --deploy=vercel` | Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. |
| Netlify | `acta init --deploy=netlify` | Secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`. |

Review the generated `.github/workflows/acta-deploy-<provider>.yml` before
enabling it. Provider setup differs by account and project configuration, but
the Acta part is always the same: build `.acta/site` and deploy that directory.

## Generated Output

`.acta/site` is generated output. Keep `.acta/` in `.gitignore`; the CI workflow
rebuilds it on every deploy.


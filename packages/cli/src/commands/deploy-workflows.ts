export const DEPLOY_PROVIDERS = ["pages", "cloudflare", "vercel", "netlify"] as const;

export type DeployProvider = (typeof DEPLOY_PROVIDERS)[number];

export const DEPLOY_WORKFLOW_TEMPLATES: Record<DeployProvider, string> = {
  pages: `name: Deploy Acta Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: acta-pages
  cancel-in-progress: false

jobs:
  build:
    name: Build Acta static viewer
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Build Acta site
        run: pnpm dlx @acta-dev/cli site --base "/\${{ github.event.repository.name }}"

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: .acta/site

  deploy:
    name: Deploy to GitHub Pages
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy Pages
        id: deployment
        uses: actions/deploy-pages@v4
`,
  cloudflare: `name: Deploy Acta to Cloudflare Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy Acta static viewer
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Build Acta site
        run: pnpm dlx @acta-dev/cli site

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .acta/site --project-name="\${{ vars.CLOUDFLARE_PROJECT_NAME }}"
`,
  vercel: `name: Deploy Acta to Vercel

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy Acta static viewer
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Build Acta site
        run: pnpm dlx @acta-dev/cli site

      - name: Deploy to Vercel
        run: pnpm dlx vercel .acta/site --prod --yes --token="\${{ secrets.VERCEL_TOKEN }}"
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
`,
  netlify: `name: Deploy Acta to Netlify

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy Acta static viewer
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Build Acta site
        run: pnpm dlx @acta-dev/cli site

      - name: Deploy to Netlify
        run: pnpm dlx netlify-cli deploy --dir=.acta/site --prod
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}
`,
};

export function isDeployProvider(value: string): value is DeployProvider {
  return DEPLOY_PROVIDERS.includes(value as DeployProvider);
}

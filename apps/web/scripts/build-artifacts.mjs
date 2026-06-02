// Generates the `.acta/dist` artifacts the viewer reads, for this monorepo's
// own demo build/dev. End users get the same artifacts from `acta build`
// (run automatically by `acta site`); this script only serves the in-repo app.
import { fileURLToPath } from "node:url";
import { buildArtifacts, loadConfig } from "@acta-dev/core";

const configPath = fileURLToPath(new URL("../../../acta.config.ts", import.meta.url));
const config = await loadConfig(configPath);
const { manifest } = await buildArtifacts({ config });

process.stdout.write(
  `Acta artifacts ready: ${manifest.documentCount} document(s) -> ${config.resolvedBuild.outDir}\n`,
);

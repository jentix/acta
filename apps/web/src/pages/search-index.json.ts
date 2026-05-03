import { buildSearchIndex } from "@acta/core";
import { loadActaWebData } from "@lib/project.js";

export async function GET() {
  const { project } = await loadActaWebData();

  return new Response(JSON.stringify(buildSearchIndex(project.documents)), {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

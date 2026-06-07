import type { ResourceResult } from "fastmcp";
import { type ActaMcpContext, actaList, actaShow } from "./tools.js";

export async function listDocsResource(context: ActaMcpContext): Promise<ResourceResult> {
  return jsonResource("acta://docs", await actaList(context));
}

export async function readDocResource(
  context: ActaMcpContext,
  input: { id: string },
): Promise<ResourceResult> {
  return jsonResource(`acta://doc/${input.id}`, await actaShow(context, input));
}

export function jsonResource(uri: string, value: unknown): ResourceResult {
  return {
    uri,
    mimeType: "application/json",
    text: `${JSON.stringify(value, null, 2)}\n`,
  };
}

import type { Document, ParsedDocumentResult } from "./types.js";
export declare function parseDocumentFile(filePath: string): ParsedDocumentResult;
export declare function slugFromTitle(title: string): string;
export declare function defaultFileNameForDocument(document: Pick<Document, "id" | "title">): string;
export declare function relativeDocumentPath(rootDir: string, filePath: string): string;

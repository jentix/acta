export class ActaMcpError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ActaMcpError";
    this.code = code;
    this.details = details;
  }
}

export function notFound(id: string): ActaMcpError {
  return new ActaMcpError("ACTA_NOT_FOUND", `Document "${id}" was not found.`, { id });
}

/**
 * Consistent API envelope used by every server action / route handler.
 *
 * Success: { ok: true, data: T }
 * Error:   { ok: false, error: string, code?: string, fields?: Record<string,string[]> }
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: string;
  code?: string;
  fields?: Record<string, string[]>;
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function fail(error: string, code?: string, fields?: Record<string, string[]>): ApiFailure {
  return { ok: false, error, code, fields };
}

export class ActionError extends Error {
  code?: string;
  fields?: Record<string, string[]>;
  constructor(message: string, code?: string, fields?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.fields = fields;
  }
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ActionError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

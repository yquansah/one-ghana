import type { Session } from './contracts';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  session?: Session | null,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(session ? { 'X-One-Ghana-CSRF': session.csrfToken } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(
      'Connection unavailable. Your draft is preserved. Reconnect and retry.',
      0,
    );
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    throw new ApiError(
      data.error ?? `Request failed (${response.status}).`,
      response.status,
      data.code,
    );
  }
  return response.json() as Promise<T>;
}
export function downloadJson(json: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[^a-zA-Z0-9_.-]/g, '-');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Typed fetch wrapper for JSON API calls
 * Defaults to POST, handles JSON serialization, and throws on errors
 */

interface FetchJsonOptions extends Omit<RequestInit, "body" | "method"> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
}

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
  ) {
    super(message)
    this.name = "FetchError"
  }
}

export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { method = "POST", body, headers, ...restOptions } = options

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...restOptions,
  }

  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  const res = await fetch(url, config)

  // Parse response body
  let data: unknown
  const contentType = res.headers.get("content-type")
  if (contentType?.includes("application/json")) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  // Throw on error responses
  if (!res.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error: unknown }).error)
        : typeof data === "string"
          ? data
          : `Request failed with status ${res.status}`

    throw new FetchError(errorMessage, res.status, res.statusText)
  }

  return data as T
}

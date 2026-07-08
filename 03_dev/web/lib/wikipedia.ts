// Politician photo lookup — free, keyless Wikipedia REST API (no auth needed).
// Best-effort: returns null on any miss/error so callers can fall back to an
// initials avatar instead of breaking the UI.

const cache = new Map<string, Promise<string | null>>();

async function fetchThumbnail(lang: "en" | "ko", name: string): Promise<string | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    name
  )}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

/** Looks up a small portrait photo for a politician by name (cached per name). */
export function getPoliticianPhoto(name: string): Promise<string | null> {
  if (!cache.has(name)) {
    cache.set(
      name,
      (async () => (await fetchThumbnail("en", name)) ?? (await fetchThumbnail("ko", name)))()
    );
  }
  return cache.get(name)!;
}

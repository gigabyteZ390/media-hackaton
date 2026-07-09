// Code-driven web search for the local-model Axis 2 path (no LLM provider tool).
// Uses DuckDuckGo's keyless HTML endpoint, so it needs no API key. This is an
// unofficial endpoint — fine for a demo, but it can rate-limit; callers treat an
// empty result as "no evidence -> UNVERIFIABLE".

export interface WebHit {
  title: string;
  url: string;
  snippet: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// DDG HTML links are redirects like //duckduckgo.com/l/?uddg=<encoded real url>.
function realUrl(href: string): string {
  try {
    const m = href.match(/[?&]uddg=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {
    /* fall through */
  }
  return href.startsWith("//") ? `https:${href}` : href;
}

export async function webSearch(query: string, max = 4): Promise<WebHit[]> {
  const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let html = "";
  try {
    const r = await fetch(endpoint, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!r.ok) return [];
    html = await r.text();
  } catch {
    return [];
  }

  const hits: WebHit[] = [];
  const linkRe =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe =
    /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const snippets: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = snippetRe.exec(html)) && snippets.length < 20) {
    snippets.push(decodeEntities(sm[1]));
  }

  let lm: RegExpExecArray | null;
  let i = 0;
  while ((lm = linkRe.exec(html)) && hits.length < max) {
    const url = realUrl(lm[1]);
    const title = decodeEntities(lm[2]);
    if (!/^https?:\/\//.test(url) || !title) {
      i++;
      continue;
    }
    hits.push({ title, url, snippet: snippets[i] ?? "" });
    i++;
  }
  return hits;
}

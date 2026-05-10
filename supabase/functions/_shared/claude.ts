const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2048,
): Promise<unknown> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada.");

  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const raw: string = data?.content?.[0]?.text ?? "";
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export function normalizeScores(
  scores: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of ["D", "I", "S", "C"]) {
    const v = Number(scores?.[key]);
    out[key] = isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
  }
  return out;
}

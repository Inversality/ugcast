// Thin OpenAI wrapper used by the AI scripting routes (script / hooks /
// translate). Model defaults to GPT-5 and is configurable via lib/config.js.
import OpenAI from "openai";
import config from "@/lib/config";

let client;

function getClient() {
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}

// Run a single system+user prompt and return the raw text completion.
export async function complete({ system, user, temperature = 0.8, maxTokens = 1200 }) {
  const openai = getClient();
  const res = await openai.chat.completions.create({
    model: config.openai.model,
    temperature,
    max_completion_tokens: maxTokens,
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: user },
    ],
  });
  return res.choices?.[0]?.message?.content?.trim() || "";
}

// Run a prompt that must return JSON and parse it. Tolerates models that wrap
// JSON in prose or code fences.
export async function completeJSON({ system, user, temperature = 0.8, maxTokens = 1500 }) {
  const text = await complete({
    system: `${system}\n\nRespond with valid JSON only — no prose, no code fences.`,
    user,
    temperature,
    maxTokens,
  });

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error("Failed to parse JSON from model response");
  }
}

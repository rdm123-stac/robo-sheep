import OpenAI from "openai";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const { prompt = "" } = JSON.parse(event.body || "{}");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in Netlify env vars" }),
      };
    }

    const client = new OpenAI({ apiKey });

    const themeInstruction = prompt?.trim()
      ? `Theme constraint: "${prompt.trim()}". All categories and words must fit this theme.`
      : "";

    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-nano",
      reasoning: { effort: "minimal" },
      max_output_tokens: 450,
      input: [
        {
          role: "system",
          content:
            "Generate fun, recognizable, safe-for-work categories and words for a party word-guessing game.",
        },
        {
          role: "user",
          content: `Generate 3 creative and unique categories for a word guessing game. For each category, provide exactly 10 related words.

${themeInstruction}

Return ONLY JSON matching the schema.`,
        },
      ],
      max_output_tokens: 900,
      text: {
        format: {
          type: "json_schema",
          name: "robo_sheep_categories",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["categories"],
            properties: {
              categories: {
                type: "array",
                minItems: 3,
                maxItems: 3,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["category", "words"],
                  properties: {
                    category: { type: "string" },
                    words: {
                      type: "array",
                      minItems: 10,
                      maxItems: 10,
                      items: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(resp.output_text);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to generate categories",
        message: err?.message || String(err),
      }),
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured in Vercel."
    });
  }

  try {
    const { profile } = req.body || {};

    if (!profile?.targetLanguage) {
      return res.status(400).json({
        error: "A target language is required."
      });
    }

    const targetLanguage = String(profile.targetLanguage).slice(0, 80);
    const nativeLanguage = String(profile.nativeLanguage || "English").slice(0, 80);
    const level = String(profile.level || "A1").slice(0, 20);
    const goal = String(profile.goal || "Real conversation").slice(0, 120);

    const interests = Array.isArray(profile.interests)
      ? profile.interests.filter(item => typeof item === "string").slice(0, 8).join(", ")
      : "Everyday life";

    const systemPrompt = [
      "You are Parla, an adaptive real-world language-learning coach.",
      "Build a short, high-value lesson that teaches language before asking the learner to produce it.",
      "The lesson should feel human, practical, modern, and relevant to an adult learner.",
      "Do not make it feel like a children's app, textbook worksheet, or generic vocabulary dump.",
      "Choose one realistic situation based on the learner's goal and interests.",
      "Teach 3 to 5 high-value expressions, not a large list.",
      "Each expression must be natural for the target language and appropriate for the learner's level.",
      "For B2+ learners, prioritize nuance, collocations, register, idiomatic phrasing, and subtle distinctions.",
      "For lower levels, keep the amount of new material small and useful.",
      "Practice should test material that was just taught.",
      "The production task should have multiple valid answers.",
      "The speaking challenge should ask the learner to respond naturally in the target language.",
      "Use English for meanings and instructional explanations unless the target language itself is more useful.",
      "Never assume Spanish. The selected target language controls every target-language example.",
      "Return ONLY structured JSON matching the supplied schema."
    ].join(" ");

    const userPrompt = [
      "Target language: " + targetLanguage,
      "Native language: " + nativeLanguage,
      "Learner level: " + level,
      "Goal: " + goal,
      "Interests: " + (interests || "Everyday life"),
      "Create one focused lesson that takes roughly 8–12 minutes."
    ].join("\n");

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        scenario: { type: "string" },
        intro: { type: "string" },
        expressions: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              phrase: { type: "string" },
              meaning: { type: "string" },
              example: { type: "string" },
              note: { type: "string" }
            },
            required: ["phrase", "meaning", "example", "note"]
          }
        },
        practice: {
          type: "object",
          additionalProperties: false,
          properties: {
            prompt: { type: "string" },
            options: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  correct: { type: "boolean" },
                  explanation: { type: "string" }
                },
                required: ["text", "correct", "explanation"]
              }
            }
          },
          required: ["prompt", "options"]
        },
        production: {
          type: "object",
          additionalProperties: false,
          properties: {
            prompt: { type: "string" },
            starter: { type: "string" }
          },
          required: ["prompt", "starter"]
        },
        speaking: {
          type: "object",
          additionalProperties: false,
          properties: {
            prompt: { type: "string" },
            instructions: { type: "string" }
          },
          required: ["prompt", "instructions"]
        }
      },
      required: ["title", "scenario", "intro", "expressions", "practice", "production", "speaking"]
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions: systemPrompt,
        input: userPrompt,
        text: {
          format: {
            type: "json_schema",
            name: "parla_lesson",
            strict: true,
            schema
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed."
      });
    }

    const outputText = typeof data?.output_text === "string" ? data.output_text.trim() : "";

    if (!outputText) {
      return res.status(502).json({
        error: "The AI returned no lesson content."
      });
    }

    let lesson;

    try {
      lesson = JSON.parse(outputText);
    } catch {
      return res.status(502).json({
        error: "The AI returned invalid lesson data."
      });
    }

    return res.status(200).json({ lesson });
  } catch (error) {
    console.error("Parla lesson generation error:", error);
    return res.status(500).json({
      error: "Could not generate the lesson."
    });
  }
}
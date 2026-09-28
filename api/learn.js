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

    const beginner = level === "A0" || level === "A1";
    const focusOptions = [
      "greeting someone",
      "ordering food or coffee",
      "asking for help",
      "getting around town",
      "buying something",
      "making simple plans",
      "checking into a hotel",
      "meeting someone new"
    ];
    const focus = focusOptions[Math.floor(Math.random() * focusOptions.length)];
    const systemPrompt = [
      "You are Parla, a premium private language tutor.",
      "Create a short, practical lesson for an adult learner in the selected target language.",
      "Never assume Spanish. The target language controls every target-language phrase and example.",
      beginner
        ? "This learner is a beginner. Make the lesson extremely easy to complete without guessing."
        : "Match the lesson difficulty closely to the learner's level.",
      beginner
        ? "Teach exactly 3 useful phrases, one phrase at a time."
        : "Teach 3 to 5 useful phrases, one at a time.",
      "Choose one simple real-life scenario and keep the entire lesson centered on it.",
      "Do not make the lesson feel like a vocabulary list. Each new phrase should have a clear job in the situation.",
      "For A0/A1, introduce sound and meaning before written form. The learner should be able to understand what a phrase means before seeing its spelling.",
      beginner
        ? "Use sentences of 1 to 4 words whenever possible. Avoid grammar terminology, idioms, slang, and multiple clauses."
        : "Use natural language appropriate to the learner's level.",
      "Every teach card must include the target phrase, a simple pronunciation guide, IPA, English meaning, when to use it, and one short example.",
      "Speech is part of every lesson at every level. Always provide pronunciation data for every taught phrase, including A0/A1 and higher levels.",
      "Every lesson must make it easy for the learner to hear the target phrase and hear the example spoken aloud before or while practicing it.",
      "For A0/A1, pronunciation should be especially clear and beginner-friendly: simple readable sound guide, accurate IPA, short phrases, and no assumption that the learner can infer pronunciation from spelling."
      "After each teach card, include a tiny multiple-choice quiz about that phrase.",
      "Include one final speaking card using language already taught.",
      "Meanings and instructions should be in English unless the learner's level makes another language clearly useful.",
      "Keep feedback concrete and encouraging.",
      beginner
        ? "For each teach card, the meaning must be understandable without knowing the target-language spelling. Do not rely on the phrase itself to explain its meaning."
        : "Make every explanation useful and concrete.",
      "Return ONLY structured JSON matching the supplied schema."
    ].join(" ");

    const userPrompt = [
      "Target language: " + targetLanguage,
      "Native language: " + nativeLanguage,
      "Learner level: " + level,
      "Goal: " + goal,
      "Interests: " + (interests || "Everyday life"),
      "Lesson scenario: " + focus,
      "Create a focused lesson that takes roughly 5–8 minutes for a beginner and 8–12 minutes for higher levels."
    ].join("\n");

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        intro: { type: "string" },
        cards: {
          type: "array",
          minItems: 7,
          maxItems: 16,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string", enum: ["teach", "quiz", "speak"] },
              phrase: { type: "string" },
              pronunciation: { type: "string" },
              ipa: { type: "string" },
              meaning: { type: "string" },
              usage: { type: "string" },
              example: { type: "string" },
              prompt: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              answer: { type: "string" },
              feedback: { type: "string" },
              instructions: { type: "string" }
            },
            required: ["type","phrase","pronunciation","ipa","meaning","usage","example","prompt","options","answer","feedback","instructions"]
          }
        }
      },
      required: ["title","intro","cards"]
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

    const outputText =
      typeof data?.output_text === "string"
        ? data.output_text.trim()
        : (data?.output || [])
            .flatMap(item => item?.content || [])
            .map(item => item?.text || "")
            .join("")
            .trim();

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

    const validCards = Array.isArray(lesson?.cards)
      && lesson.cards.length === 7
      && lesson.cards.every(card => ["teach", "quiz", "speak"].includes(card?.type));

    if (!lesson?.title || !lesson?.intro || !validCards) {
      return res.status(502).json({ error: "The AI returned an incomplete lesson." });
    }

    const expectedSequence = ["teach", "quiz", "teach", "quiz", "teach", "quiz", "speak"];
    const actualSequence = lesson.cards.map(card => card.type);
    const correctSequence = expectedSequence.every((type, index) => actualSequence[index] === type);

    if (!correctSequence) {
      return res.status(502).json({ error: "The AI returned an invalid lesson sequence." });
    }

    const teachCards = lesson.cards.filter(card => card.type === "teach");
    const quizCards = lesson.cards.filter(card => card.type === "quiz");

    if (teachCards.length !== 3 || quizCards.length !== 3) {
      return res.status(502).json({ error: "The AI returned an incomplete lesson sequence." });
    }

    for (const card of teachCards) {
      if (!card.phrase || !card.meaning || !card.pronunciation || !card.ipa || !card.usage || !card.example) {
        return res.status(502).json({ error: "The AI returned an incomplete teaching card." });
      }
    }

    for (const card of quizCards) {
      if (!card.prompt || !Array.isArray(card.options) || card.options.length < 2 || !card.answer) {
        return res.status(502).json({ error: "The AI returned an incomplete quiz card." });
      }
    }

    return res.status(200).json({ lesson });
  } catch (error) {
    console.error("Parla lesson generation error:", error);
    return res.status(500).json({
      error: "Could not generate the lesson."
    });
  }
}
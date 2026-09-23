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

    const level = profile.level || "A1";
    const goal = profile.goal || "Real conversation";
    const interests = Array.isArray(profile.interests) && profile.interests.length
      ? profile.interests.join(", ")
      : "Everyday life";

    const systemPrompt = [
      "You are Parla, an adaptive language-learning coach.",
      "Your job is to teach useful language first, then practice it, then prepare the learner to use it in real conversation.",
      "Never make the lesson feel like a generic textbook or a children's language app.",
      "Use natural everyday language appropriate to the target language and learner level.",
      "Teach meanings clearly before testing.",
      "Prefer a small set of high-value expressions over a giant vocabulary list.",
      "Use the learner's goal and interests to choose a practical real-world situation.",
      "Return ONLY valid JSON with this exact shape:",
      '{"title":"string","scenario":"string","intro":"string","expressions":[{"phrase":"string","meaning":"string","example":"string","note":"string"}],"practice":{"prompt":"string","options":[{"text":"string","correct":true,"explanation":"string"},{"text":"string","correct":false,"explanation":"string"},{"text":"string","correct":false,"explanation":"string"}]},"production":{"prompt":"string","starter":"string"},"speaking":{"prompt":"string","instructions":"string"}}'
    ].join(" ");

    const userPrompt = [
      `Target language: ${profile.targetLanguage}`,
      `Learner level: ${level}`,
      `Goal: ${goal}`,
      `Interests: ${interests}`,
      "Create one focused 8–12 minute lesson.",
      "Choose a real-world situation that fits this learner.",
      "Do not assume Spanish; all teaching content must be in the selected target language.",
      "Keep explanations in English unless a brief target-language explanation is more useful.",
      "For B2+ learners, teach nuance, register, collocations, and natural phrasing instead of beginner material."
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed."
      });
    }

    const text = Array.isArray(data?.output)
      ? data.output
          .flatMap(item => Array.isArray(item?.content) ? item.content : [])
          .filter(item => item?.type === "output_text")
          .map(item => item.text)
          .join("")
      : "";

    if (!text) {
      return res.status(502).json({
        error: "The AI returned no lesson content."
      });
    }

    let lesson;

    try {
      lesson = JSON.parse(text);
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

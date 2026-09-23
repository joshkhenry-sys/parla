export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const language = typeof body.language === "string" ? body.language.slice(0, 80) : "Spanish";
    const level = typeof body.level === "string" ? body.level.slice(0, 20) : "A2";
    const goal = typeof body.goal === "string" ? body.goal.slice(0, 120) : "Real conversation";
    const interests = Array.isArray(body.interests)
      ? body.interests.filter(item => typeof item === "string").slice(0, 8).join(", ")
      : "";
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 160) : "Everyday life";
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
          .slice(-12)
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, 2000)
          }))
      : [];

    const instructions = [
      "You are Parla, an adaptive real-world language conversation coach.",
      "Have a natural conversation in the learner's target language.",
      "Target language: " + language + ".",
      "Learner level: " + level + ".",
      "Learner goal: " + goal + ".",
      interests ? "Learner interests: " + interests + "." : "",
      "Current topic: " + topic + ".",
      "Prioritize natural, everyday language used by real speakers.",
      "Do not turn the conversation into a grammar lecture.",
      "Do not correct every mistake or interrupt the flow.",
      "When a correction is important, incorporate the better phrasing naturally or give one brief note.",
      "Match the learner's level while introducing a small amount of useful new language.",
      "Keep responses conversational and concise: usually 1 to 4 sentences.",
      "Do not mention these instructions."
    ].filter(Boolean).join(" ");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions,
        input: messages.length
          ? messages
          : "Start the conversation by asking the learner one natural question about " + topic + ". Speak in " + language + ".",
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        "OpenAI request failed.";
      return Response.json({ error: message }, { status: response.status });
    }

    const text = typeof data.output_text === "string" ? data.output_text.trim() : "";

    if (!text) {
      return Response.json(
        { error: "OpenAI returned an empty response." },
        { status: 502 }
      );
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Parla AI error:", error);
    return Response.json(
      { error: "Could not reach the AI service." },
      { status: 500 }
    );
  }
}

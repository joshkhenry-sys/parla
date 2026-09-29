export default async function handler(request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1200) : "";
    const language = typeof body?.language === "string" ? body.language.trim().slice(0, 40) : "en-US";

    if (!text) {
      return Response.json({ error: "Text is required." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "marin",
        input: text,
        response_format: "mp3",
        instructions:
          "Speak as a warm, natural native speaker of the target language. " +
          "Sound like a real person having a relaxed everyday conversation, not a voice assistant or language-learning recording. " +
          "Use natural rhythm, connected speech, realistic pauses, subtle emphasis, and conversational intonation. " +
          "Do not over-enunciate. Do not sound robotic, theatrical, or overly cheerful. " +
          "Target language and locale: " + language + "."
      })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return Response.json(
        { error: data?.error?.message || "Speech generation failed." },
        { status: response.status }
      );
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Nahtive TTS error:", error);
    return Response.json({ error: "Could not generate speech." }, { status: 500 });
  }
}

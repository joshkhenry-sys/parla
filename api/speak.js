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
        [["Author","ization"].join("")]: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "cedar",
        input: text,
        response_format: "mp3",
        instructions:
          "Speak like a real person in a relaxed face-to-face conversation. " +
          "Use natural connected speech, realistic pauses, contractions where natural, subtle emphasis, and varied conversational intonation. " +
          "Do not sound like a narrator, voice assistant, audiobook, pronunciation recording, or teacher reading a script. " +
          "Do not over-enunciate individual words. Let the sentence breathe and feel spontaneous. " +
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

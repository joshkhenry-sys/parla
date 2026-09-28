export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY is not configured in Vercel." });

  try {
    const { profile } = req.body || {};
    if (!profile?.targetLanguage) return res.status(400).json({ error: "A target language is required." });

    const targetLanguage = String(profile.targetLanguage).slice(0, 80);
    const nativeLanguage = String(profile.nativeLanguage || "English").slice(0, 80);
    const level = String(profile.level || "A1").slice(0, 20);
    const goal = String(profile.goal || "Real conversation").slice(0, 120);
    const lessonContext = profile.lessonContext && typeof profile.lessonContext === "object" ? profile.lessonContext : {};
    const interests = Array.isArray(profile.interests)
      ? profile.interests.filter(x => typeof x === "string").slice(0, 8).join(", ")
      : "Everyday life";

    const difficulty = {
      A0: "Start extremely gently. Teach survival language, one idea at a time. Use short phrases and lots of English support.",
      A1: "Build a small practical foundation. Teach short chunks, then simple substitutions and responses.",
      A2: "Move from memorized phrases into short original responses. Add common connectors and everyday variations.",
      B1: "Use natural everyday speech, follow-up questions, paraphrases, and a little slang or idiomatic language when appropriate.",
      "B2": "Use nuanced everyday language, register, natural fillers, implied meaning, and flexible responses.",
      "B2+": "Expect spontaneous speech. Include nuance, tone, alternatives, and realistic social pressure.",
      C1: "Use fluent, natural language with nuance, register shifts, idioms, and conversational repair.",
      C2: "Use highly natural native-level language, subtle tone, implied meaning, cultural context, and flexible reformulation."
    }[level] || "Match the learner's level closely.";

    const focusOptions = [
      "ordering food or coffee","meeting someone new","making weekend plans",
      "asking for help","getting around town","buying something","traveling",
      "making small talk","handling a misunderstanding","making an appointment",
      "talking about interests","dealing with an everyday problem"
    ];
    const focus = focusOptions[Math.floor(Math.random() * focusOptions.length)];

    const systemPrompt = [
      "You are Nahtive, a premium real-world language tutor.",
      "Build a complete lesson, not a vocabulary drill and not a conversation-only activity.",
      "The lesson must teach first and gradually move toward independent speaking.",
      "The target language is authoritative: never substitute another language.",
      "Everything in the target language must sound like something a real speaker would actually say.",
      difficulty,
      "Use one coherent real-world scene from beginning to end.",
      "Teach 3 to 5 high-value language chunks. Explain meaning, pronunciation, usage, and one natural example.",
      "After teaching each chunk, check understanding without requiring speech.",
      "Then give guided practice where the learner constructs or chooses a response using what was just taught.",
      "Only after the learner has learned and practiced should speaking begin.",
      "End with a short role-play that gradually becomes less scaffolded. Do not jump straight from repeating a phrase into free conversation.",
      "A0/A1: heavily scaffold the role-play and accept very short responses.",
      "A2/B1: require simple original responses and one follow-up.",
      "B2+: require spontaneous responses, natural alternatives, and conversational repair.",
      "Include a pronunciation guide and IPA for every taught phrase.",
      "Include English explanations so the learner understands before being asked to produce language.",
      "Do not use grammar terminology unless it directly helps the learner.",
      "Do not make every stage a multiple-choice quiz.",
      "Return ONLY JSON matching the schema."
    ].join(" ");

    const userPrompt = [
      "Target language: " + targetLanguage,
      "Native language: " + nativeLanguage,
      "Learner level: " + level,
      "Goal: " + goal,
      "Interests: " + (interests || "Everyday life"),
      "Scenario direction: " + focus,
      "Existing lesson seed (use it as a starting point, but expand it rather than copying it): " + JSON.stringify(lessonContext),
      "Make the lesson feel like a guided experience that takes about 10 minutes for A0/A1 and 12–18 minutes for higher levels."
    ].join("\n");

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        intro: { type: "string" },
        scene: {
          type: "object",
          additionalProperties: false,
          properties: {
            setting: { type: "string" },
            moment: { type: "string" },
            learnerRole: { type: "string" },
            goal: { type: "string" }
          },
          required: ["setting","moment","learnerRole","goal"]
        },
        cards: {
          type: "array",
          minItems: 10,
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string", enum: ["teach","check","guided","speak","conversation"] },
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
              instructions: { type: "string" },
              expected: { type: "string" },
              followUp: { type: "string" }
            },
            required: ["type","phrase","pronunciation","ipa","meaning","usage","example","prompt","options","answer","feedback","instructions","expected","followUp"]
          }
        }
      },
      required: ["title","intro","scene","cards"]
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        reasoning: { effort: "low" },
        max_output_tokens: 5000,
        instructions: systemPrompt,
        input: userPrompt,
        text: { format: { type: "json_schema", name: "nahtive_lesson", strict: true, schema } },
        store: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const requestId = response.headers.get("x-request-id") || null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed.",
        requestId
      });
    }

    const outputText = typeof data?.output_text === "string"
      ? data.output_text.trim()
      : (data?.output || []).flatMap(item => item?.content || []).map(item => item?.text || "").join("").trim();

    if (!outputText) return res.status(502).json({ error: "The AI returned no lesson content.", requestId });

    let lesson;
    try { lesson = JSON.parse(outputText); }
    catch { return res.status(502).json({ error: "The AI returned invalid lesson data.", requestId }); }

    const cards = Array.isArray(lesson.cards) ? lesson.cards : [];
    const types = cards.map(c => c.type);
    const teachCount = cards.filter(c => c.type === "teach").length;
    const checkCount = cards.filter(c => c.type === "check").length;
    const guidedCount = cards.filter(c => c.type === "guided").length;
    const speakCount = cards.filter(c => c.type === "speak").length;
    const conversationCount = cards.filter(c => c.type === "conversation").length;

    const hasLearning = teachCount >= 3 && checkCount >= 2;
    const hasPractice = guidedCount >= 2;
    const hasSpeaking = speakCount >= 1;
    const hasConversation = conversationCount >= 1;

    if (!lesson.title || !lesson.intro || !lesson.scene?.setting || !hasLearning || !hasPractice || !hasSpeaking || !hasConversation) {
      return res.status(502).json({ error: "The AI returned an incomplete lesson structure.", requestId });
    }

    for (const card of cards) {
      if (card.type === "teach" && (!card.phrase || !card.meaning || !card.pronunciation || !card.ipa || !card.usage || !card.example)) {
        return res.status(502).json({ error: "The AI returned an incomplete teaching card.", requestId });
      }
      if (card.type === "check" && (!card.prompt || !Array.isArray(card.options) || card.options.length < 2 || !card.answer)) {
        return res.status(502).json({ error: "The AI returned an incomplete understanding check.", requestId });
      }
      if (card.type === "guided" && !card.prompt) {
        return res.status(502).json({ error: "The AI returned an incomplete guided practice card.", requestId });
      }
      if ((card.type === "speak" || card.type === "conversation") && !card.prompt) {
        return res.status(502).json({ error: "The AI returned an incomplete speaking card.", requestId });
      }
    }

    return res.status(200).json({ lesson, meta: { level, types, teachCount, checkCount, guidedCount, speakCount, conversationCount } });
  } catch (error) {
    console.error("Nahtive lesson generation error:", error);
    if (error?.name === "AbortError") return res.status(504).json({ error: "The AI lesson request timed out after 55 seconds." });
    return res.status(500).json({ error: error?.message || "Could not generate the lesson." });
  }
}
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
      A0: "Treat A0 as Pre-A1. Teach only isolated words, very short fixed expressions, and immediate needs. Prefer 1–3 target-language words per chunk, with English support. Do not use full sentences unless absolutely necessary. No idioms, slang, subordinate clauses, tense contrasts, abstract vocabulary, or long questions. Examples must also be extremely short and concrete.",
      A1: "Use true beginner language: familiar everyday expressions, personal details, basic needs, simple one-clause sentences, and very short questions. Avoid idioms, slang, abstract language, and multi-clause sentences.",
      A2: "Use short routine exchanges and simple original sentences about familiar topics. Add basic connectors and common everyday variations, but keep grammar and vocabulary concrete.",
      B1: "Use natural everyday speech, follow-up questions, paraphrases, and a little slang or idiomatic language when appropriate.",
      "B2": "Use nuanced everyday language, register, natural fillers, implied meaning, and flexible responses.",
      "B2+": "Expect spontaneous speech. Include nuance, tone, alternatives, and realistic social pressure.",
      C1: "Treat the learner as an advanced speaker. Build lessons around nuanced everyday communication: hedging, tone, register shifts, idiomatic phrasing, indirectness, disagreement, storytelling, persuasion, ambiguity, and conversational repair. Require reformulation rather than simple translation.",
      C2: "Treat the learner as near-native. Do not teach basic vocabulary. Build lessons around subtle meaning, pragmatic choices, irony when appropriate, cultural assumptions, register, subtext, rhetorical choices, collocations, discourse markers, natural alternatives, and precise reformulation. Ask the learner to explain why one expression fits better than another and to adapt language under changing social conditions."
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
      "Build a complete mission-based lesson, not a vocabulary drill and not a conversation-only activity. The learner should feel like they are accomplishing something in a real situation, while every activity teaches or tests language needed for that mission.",
      "Design the lesson around one specific moment with a beginning, a change, and an outcome. Avoid generic topics such as 'daily life' unless the scene makes them concrete. Examples: returning the wrong order at a café, asking a coworker to swap a shift, negotiating a price at a market, checking into a hotel when the room is not ready, making weekend plans when friends disagree.",
      "Choose language for usefulness, not textbook completeness. Teach three high-value chunks that the learner can immediately use in the scene. Do not teach three unrelated phrases.",
      "Every card must advance the same scene. The learner should know why they are learning the expression before producing it.",
      "Use English for explanations and task instructions because the learner's native language is English. Target-language dialogue, examples, choices, and learner output belong in the target language.",
      "Avoid repetitive 'What does X mean?' questions. Understanding checks should test what a speaker would actually choose in context. Guided tasks should require the learner to adapt the chunk to a changed detail. Speaking tasks should require actual production.",
      "Include a small realistic twist near the end: the other person changes a detail, misunderstands something, asks a follow-up, or pushes back. The learner must respond using language from the lesson.",
      "The final role-play must be open enough that the learner cannot simply copy the model answer. Give a clear English situation and goal, then require a natural target-language response.",
      "For B1+, include at least one natural alternative or register choice. For B2+, C1 and C2, include pragmatic judgment, tone, implication, reformulation, or conversational repair rather than simply harder vocabulary.",
      "The lesson must teach first and gradually move toward independent speaking.",
      "The target language is authoritative: never substitute another language.",
      "The learner level is authoritative. Match the requested level exactly. A0 means Pre-A1, A1 means true beginner, A2 means elementary, B1 means intermediate, B2/B2+ means upper-intermediate, and C1/C2 means advanced. Never use advanced language just because it sounds more interesting. A0/A1 lessons must be genuinely easy before difficulty rises.",
      "For C1/C2, assume the learner already knows common greetings, introductions, basic requests, and everyday beginner vocabulary. Start with sophisticated, high-frequency native language used in real adult conversation."
      "Everything in the target language must sound like something a real speaker would actually say.",
      difficulty,
      "Use one coherent real-world scene from beginning to end. The scene must be scaled to the learner: A0 should be a tiny survival moment such as greeting, choosing, paying, yes/no, or identifying a basic item; A1 should be a simple everyday interaction; A2 should be a routine exchange with a little flexibility; higher levels can introduce social pressure and nuance.",
      "For B2/B2+/C1/C2, make the scene intellectually or socially demanding: negotiation, disagreement, explaining a position, resolving ambiguity, making a nuanced request, telling a story, or navigating an awkward social moment.",
      "Teach exactly 3 high-value language chunks, one at a time. Every teach card MUST explicitly explain the phrase in clear English before the learner is asked to answer anything. Level constraints are hard requirements: A0 chunks should normally be 1–3 target-language words; A1 chunks should normally be short fixed expressions or one-clause sentences; A2 chunks can be short routine sentences; B1+ can become progressively more natural, idiomatic, and nuanced.",
      "Each teach card must contain: target phrase, plain-English meaning, pronunciation, IPA, when a native speaker uses it, one natural target-language example, and an English explanation of why that example fits the scene.",
      "Use this exact progression: scene -> teach chunk 1 -> contextual choice -> guided response -> teach chunk 2 -> contextual choice -> guided response -> teach chunk 3 -> twist challenge -> speaking attempt -> short role-play turn -> final role-play turn. The learner should enter the situation before being taught language. Never use a definition-only multiple-choice question."
      "Every check, guided, and challenge prompt MUST be written in the learner's native language (English in this product) and clearly state what the learner is being asked to do.",
      "Checks must come only after the relevant phrase has been taught. Never introduce an unexplained target-language phrase inside a question and expect the learner to infer its meaning.",
      "Guided practice must show the relevant phrase or a clear English situation before asking for a response. The learner should always know what they are trying to say.",
      "Only after the learner has learned and practiced all three chunks should speaking begin.",
      "End with a short role-play that gradually becomes less scaffolded. Do not jump straight from repeating a phrase into free conversation.",
      "A0/A1: heavily scaffold the role-play and accept very short responses.",
      "A2/B1: require simple original responses and one follow-up.",
      "B2+: require spontaneous responses, natural alternatives, and conversational repair.",
      "Include a pronunciation guide and IPA for every taught phrase.",
      "Include English explanations so the learner understands before being asked to produce language.",
      "Do not use grammar terminology unless it directly helps the learner.",
      "Make the lesson feel like a polished game loop: learn something useful, make a choice, build a response, get immediate feedback, then face a slightly harder version of the same situation. At A0, the interaction can be as simple as recognizing or producing one basic word or fixed expression; difficulty should come from the situation, not harder vocabulary."
      "Use varied challenges rather than repeating the same interaction. Mix recognition, meaning, choosing the most natural phrase, filling or constructing a response, changing one detail, speaking, and a short role-play.",
      "Keep the learner curious. Use realistic stakes and small surprises inside the scene: a changed order, a follow-up question, a misunderstanding, a preference, a time constraint, or a social nuance.",
      "Difficulty should rise within the lesson. Early tasks are heavily supported; later tasks remove choices and require the learner to produce language independently.",
      "Reward progress in the lesson with meaningful momentum, but never use childish characters, cartoon language, or fake praise after every click.",
      "For B1+, include at least one moment where two answers are grammatically possible but only one sounds natural in the situation.",
      "For B2+, C1 and C2, include register, tone, idiom, implication, or conversational repair challenges.",
      "Advanced curriculum rule: do not structure C1/C2 as beginner lessons with harder vocabulary. The task itself must require advanced language judgment. Include at least one contrast between two plausible expressions, one reformulation task, one implied-meaning or tone task, and one moment where the social context changes and the learner must adapt.",
      "C1/C2 progression: first expose a nuanced expression in context, then analyze what it communicates, then compare natural alternatives, then reformulate it for a different relationship or register, then use it spontaneously in the scene.",
      "C1/C2 questions should test pragmatic competence, not word difficulty. A correct answer should depend on what a native speaker would naturally choose in that exact context.",
      "Never pad an advanced lesson with greetings, alphabet material, basic introductions, beginner travel phrases, or elementary vocabulary merely to satisfy the lesson structure.",
      "Card ordering is mandatory. Return exactly 12 cards in this order: scene, teach, check, guided, teach, check, guided, teach, challenge, speak, conversation, conversation. Do not front-load questions. The first card must make the learner feel like they have entered a real situation, not opened a textbook.",
      "Return ONLY JSON matching the schema."
    ].join(" ");

    const userPrompt = [
      "Target language: " + targetLanguage,
      "Native language: " + nativeLanguage,
      "Learner level: " + level,
      "Goal: " + goal,
      "Interests: " + (interests || "Everyday life"),
      "Scenario direction: " + focus,
      "Lesson context is only a scenario hint. Do NOT copy old phrases, cards, greetings, or vocabulary from it. Build new level-appropriate language from scratch: " + JSON.stringify(lessonContext),
      "Make the lesson feel like a guided real-world experience that takes about 6–10 minutes for A0/A1 and 10–15 minutes for higher levels. Keep each card focused. Do not pad the lesson with redundant explanation, pronunciation text, or multiple audio buttons."
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
          minItems: 12,
          maxItems: 12,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string", enum: ["scene","teach","check","guided","challenge","speak","conversation"] },
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
              followUp: { type: "string" },
              context: { type: "string" },
              goal: { type: "string" },
              dialogue: { type: "array", items: { type: "object", additionalProperties: false, properties: { speaker: {type:"string"}, text: {type:"string"} }, required:["speaker","text"] } }
            },
            required: ["type","phrase","pronunciation","ipa","meaning","usage","example","prompt","options","answer","feedback","instructions","expected","followUp","context","goal","dialogue"]
          }
        }
      },
      required: ["title","intro","scene","cards"]
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8500);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        reasoning: { effort: "low" },
        max_output_tokens: 3800,
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

    if (!outputText) return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned no lesson content.", requestId });

    let lesson;
    try { lesson = JSON.parse(outputText); }
    catch { return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned invalid lesson data.", requestId }); }

    const cards = Array.isArray(lesson.cards) ? lesson.cards : [];
    const levelLimits = {
      A0: { phraseMax: 4, exampleMax: 7 },
      A1: { phraseMax: 9, exampleMax: 12 },
      A2: { phraseMax: 14, exampleMax: 18 }
    };
    const limit = levelLimits[level];
    const levelContentTooHard = limit && cards.some(c => {
      const phraseWords = String(c.phrase || "").trim().split(/\s+/).filter(Boolean).length;
      const exampleWords = String(c.example || "").trim().split(/\s+/).filter(Boolean).length;
      return phraseWords > limit.phraseMax || exampleWords > limit.exampleMax;
    });
    const types = cards.map(c => c.type);
    const teachCount = cards.filter(c => c.type === "teach").length;
    const checkCount = cards.filter(c => c.type === "check").length;
    const guidedCount = cards.filter(c => c.type === "guided").length;
    const speakCount = cards.filter(c => c.type === "speak").length;
    const conversationCount = cards.filter(c => c.type === "conversation").length;
    const basicGreetingPattern = /^(hola|hello|hi|buenos d[ií]as|buenas|hey|bonjour|hallo|ciao|oi|ol[aá])\b/i;
    const advancedTeachIsTooBasic = ["B1","B2","B2+","C1","C2"].includes(level) && cards.some(c => c.type === "teach" && basicGreetingPattern.test(String(c.phrase || "").trim()));

    const hasLearning = teachCount === 3 && checkCount >= 2;
    const challengeCount = cards.filter(c => c.type === "challenge").length;
    const sceneCount = cards.filter(c => c.type === "scene").length;
    const hasPractice = guidedCount >= 2;
    const hasChallenge = challengeCount >= 1;
    const hasSpeaking = speakCount >= 1;
    const hasConversation = conversationCount >= 1;

    if (!lesson.title || !lesson.intro || !lesson.scene?.setting || sceneCount !== 1 || !hasLearning || !hasPractice || !hasChallenge || !hasSpeaking || !hasConversation || advancedTeachIsTooBasic || levelContentTooHard) {
      return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an incomplete lesson structure.", requestId });
    }

    for (const card of cards) {
      if (card.type === "scene" && (!Array.isArray(card.dialogue) || card.dialogue.length < 2 || !card.goal)) {
        return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an incomplete scene card.", requestId });
      }
      if (card.type === "teach" && (!card.phrase || !card.meaning || !card.usage || !card.example)) {
        return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an incomplete teaching card.", requestId });
      }
      if (card.type === "check" && (!card.prompt || !Array.isArray(card.options) || card.options.length < 2 || !card.answer)) {
        return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an incomplete understanding check.", requestId });
      }
      if (card.type === "guided" && !card.prompt) {
        return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an incomplete guided practice card.", requestId });
      }
      if ((card.type === "challenge" || card.type === "speak" || card.type === "conversation") && !card.prompt) {
        return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an incomplete speaking card.", requestId });
      }
    }

    const requiredOrder = ["scene","teach","check","guided","teach","check","guided","teach","challenge","speak","conversation","conversation"];
    const orderIsValid = cards.length === requiredOrder.length && cards.every((card, i) => card.type === requiredOrder[i]);
    if (!orderIsValid) {
      return res.status(200).json({ lesson: null, degraded: true, error: "The AI returned an invalid lesson sequence.", requestId });
    }

    return res.status(200).json({ lesson, meta: { level, types, teachCount, checkCount, guidedCount, challengeCount, speakCount, conversationCount, sceneCount } });
  } catch (error) {
    console.error("Nahtive lesson generation error:", error);
    if (error?.name === "AbortError") return res.status(200).json({ lesson: null, degraded: true, error: "AI generation timed out; local lesson fallback is active." });
    return res.status(200).json({ lesson: null, degraded: true, error: error?.message || "AI generation unavailable; local lesson fallback is active." });
  }
}
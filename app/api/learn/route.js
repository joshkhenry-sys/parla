import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { profile } = await req.json();

    const prompt = `Create a practical ${profile.level} ${profile.targetLanguage} lesson.

Return ONLY valid JSON with this structure:
{
  "title":"",
  "intro":"",
  "scenario":"",
  "expressions":[
    {"phrase":"","meaning":"","example":"","note":""}
  ],
  "practice":{
    "prompt":"",
    "options":[
      {"text":"","correct":true,"explanation":""},
      {"text":"","correct":false,"explanation":""}
    ]
  },
  "production":{"prompt":"","starter":""},
  "speaking":{"prompt":"","instructions":""}
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return Response.json({
      lesson: JSON.parse(completion.choices[0].message.content),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to generate lesson." },
      { status: 500 }
    );
  }
}

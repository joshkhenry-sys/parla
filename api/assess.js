const MODEL="gpt-4o-mini";
export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:"Missing OPENAI_API_KEY"});
 try{
  const {targetLanguage,targetCode}=req.body||{};
  if(!targetLanguage||!targetCode) return res.status(400).json({error:"Missing language"});
  const prompt=`Create a CEFR placement test for a language-learning app called Nahtive.
Target language: ${targetLanguage} (${targetCode}).
The learner's interface/native language is English.
Return exactly 28 questions: exactly 4 labeled A0, exactly 4 A1, exactly 4 A2, exactly 4 B1, exactly 4 B2, exactly 4 C1, and exactly 4 C2. This is a serious CEFR diagnostic, not a phrase-recognition quiz. Randomize the order of all 28 questions so the test does not feel like seven predictable blocks.
For every CEFR band, create four different diagnostic tasks with type values: "reading", "listening", "grammar", and "production". Every item must use a different scenario, communicative goal, target construction, and surface wording from every other item in the test. Do not recycle one sentence across multiple questions, do not ask the same question in reverse, do not use the same café/reservation/store/tired-yesterday examples repeatedly, and do not reuse a template with only one word changed. The four items at a given level must assess distinct evidence, not four versions of the same skill. The target language must provide the evidence of proficiency.
Reading: a realistic message, dialogue, sign, post, or short passage in the target language with a comprehension or usage question.
Listening: give a natural target-language utterance in audioText and ask a comprehension question. The frontend will speak audioText aloud, so audioText must contain only the target-language utterance. Do not put the answer inside the question text.
Grammar: test natural grammar, syntax, morphology, tense/aspect, word order, agreement, particles, cases, or other language-specific structures as appropriate.
Production: present a realistic situation and ask the learner to choose the most natural response. Test communicative intent, register, reformulation, indirectness, or nuance rather than translation.
A0: survival comprehension and essential meaning.
A1: everyday requests, common verbs, basic sentence structure and simple time references.
A2: past/future meaning, comparisons, connectors, routine problems and short contextual choices.
B1: storytelling, conditionals, tense/aspect, conversational repair, everyday idioms and follow-up responses.
B2: nuance, register, collocations, idiomatic language, implied meaning, natural alternatives and social situations.
C1: sophisticated syntax, discourse markers, subtle register, ambiguity, pragmatic meaning, indirectness and precise reformulation.
C2: near-native distinctions, subtle connotation, culturally natural phrasing, rhetorical intent, style shifts and fine grammatical distinctions.
Do not make higher-level questions merely longer. The task itself must become more demanding. Never pad B2, C1, or C2 with greetings, introductions, beginner travel phrases, or elementary vocabulary. The task itself must become more demanding. Never pad B2/C1/C2 with greetings, introductions, beginner travel phrases, or elementary vocabulary.
Each question must have exactly 3 answer choices and exactly one correct answer. Vary the correct answer index across the test; do not make answer 0 the default. Distractors must be plausible for a learner at that level and must be written in the target language whenever the task is choosing a target-language response. Avoid translation-only tasks: reading and listening must ask about intent, inference, detail, tone, or context. Production must require selecting a context-appropriate reply. Make each item self-contained and answerable without knowing any other item.
Do not reduce the assessment to English translations. The target language must provide meaningful evidence of proficiency.
`;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),55000);
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({
   model:MODEL,input:prompt,max_output_tokens:5000,
   text:{format:{type:"json_schema",name:"placement_test",strict:true,schema:{type:"object",additionalProperties:false,properties:{questions:{type:"array",minItems:28,maxItems:28,items:{type:"object",additionalProperties:false,properties:{level:{type:"string",enum:["A0","A1","A2","B1","B2","C1","C2"]},type:{type:"string",enum:["reading","listening","grammar","production"]},question:{type:"string"},audioText:{type:"string"},options:{type:"array",minItems:3,maxItems:3,items:{type:"string"}},answer:{type:"integer",minimum:0,maximum:2}},required:["level","type","question","audioText","options","answer"]}}},required:["questions"]}}}
  }),signal:controller.signal}); clearTimeout(timer);
  if(!r.ok){const body=await r.text();return res.status(502).json({error:"Assessment generation failed",detail:body.slice(0,500)})}
  const data=await r.json(); const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
  if(!text) return res.status(502).json({error:"No assessment returned"});
  const parsed=JSON.parse(text);
  if(!parsed.questions||parsed.questions.length!==28) return res.status(502).json({error:"Incomplete assessment"});
  // Reject mechanically repetitive items instead of silently shipping a weak test.
  const normalize = value => String(value || "").toLowerCase().normalize("NFKC").replace(/[\p{P}\p{S}\s]+/gu, " ").trim();
  const questionKeys = parsed.questions.map(q => normalize(q.question));
  const utteranceKeys = parsed.questions.map(q => normalize(q.audioText)).filter(Boolean);
  if(new Set(questionKeys).size !== questionKeys.length) return res.status(502).json({error:"Assessment contained repeated questions"});
  if(new Set(utteranceKeys).size !== utteranceKeys.length) return res.status(502).json({error:"Assessment contained repeated listening prompts"});
  for(const q of parsed.questions){
    if(!Array.isArray(q.options)||q.options.length!==3||new Set(q.options.map(normalize)).size!==3) return res.status(502).json({error:"Assessment options were repetitive"});
    if(q.type==="listening"&&!normalize(q.audioText)) return res.status(502).json({error:"Listening item was missing audio"});
  }
  const answerCounts=[0,0,0];
  parsed.questions.forEach(q=>answerCounts[q.answer]++);
  if(Math.max(...answerCounts)-Math.min(...answerCounts)>6) return res.status(502).json({error:"Answer choices were not balanced"});
  const expectedLevels=["A0","A1","A2","B1","B2","C1","C2"];
  const counts=Object.fromEntries(expectedLevels.map(level=>[level,0]));
  for(const q of parsed.questions){if(!counts[q.level]&&counts[q.level]!==0)return res.status(502).json({error:"Invalid assessment level"});counts[q.level]++;}
  if(expectedLevels.some(level=>counts[level]!==4)) return res.status(502).json({error:"Assessment level distribution was invalid"});
  const types=["reading","listening","grammar","production"];
  for(const level of expectedLevels){ const rows=parsed.questions.filter(q=>q.level===level); if(types.some(type=>rows.filter(q=>q.type===type).length!==1)) return res.status(502).json({error:"Assessment task distribution was invalid"}); }
  return res.status(200).json(parsed);
 }catch(e){return res.status(500).json({error:e.name==="AbortError"?"Assessment timed out":e.message})}
}
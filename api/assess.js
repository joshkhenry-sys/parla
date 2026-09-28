const MODEL="gpt-5.6-luna";
export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:"Missing OPENAI_API_KEY"});
 try{
  const {targetLanguage,targetCode}=req.body||{};
  if(!targetLanguage||!targetCode) return res.status(400).json({error:"Missing language"});
  const prompt=`Create a CEFR placement test for a language-learning app called Nahtive.
Target language: ${targetLanguage} (${targetCode}).
The learner's interface/native language is English.
Return exactly 14 multiple-choice questions: exactly 2 labeled A0, exactly 2 labeled A1, exactly 2 labeled A2, exactly 2 labeled B1, exactly 2 labeled B2, exactly 2 labeled C1, and exactly 2 labeled C2. The questions must form a real diagnostic assessment, not a phrase-recognition quiz. Make each question specific to the TARGET LANGUAGE's actual grammar, vocabulary, syntax, and natural usage. Use realistic situations and target-language examples. Write instructions in English, but make the language evidence itself the thing being tested.
For each level, use two different diagnostic tasks:
A0: basic comprehension and essential survival vocabulary.
A1: everyday requests, common verbs, basic sentence structure and simple time references.
A2: past/future meaning, comparisons, common connectors, routine situations and short contextual choices.
B1: tense/aspect, pronouns or case where relevant, conditionals, connectors, natural everyday phrasing and conversational repair.
B2: nuance, register, collocations, idiomatic language, implied meaning and choosing what a native speaker would naturally say.
C1: sophisticated syntax, discourse markers, subtle register, idiomatic nuance, ambiguity and precise reformulation.
C2: highly nuanced meaning, stylistic/register distinctions, culturally natural phrasing, implied meaning and fine grammatical distinctions.
Do not make higher-level questions merely longer. They should require different language knowledge.
Every question must have a clear real-world context or a precise linguistic task, and distractors must be plausible for a learner at that level. Do not use generic English distractors that make the answer obvious.
Each question must have exactly 3 answer choices and exactly one correct answer.
Do not translate the target-language sentence into English as the only task. The target language must provide meaningful evidence of proficiency.
`;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),55000);
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization:"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({
   model:MODEL,input:prompt,reasoning:{effort:"low"},max_output_tokens:5000,
   text:{format:{type:"json_schema",name:"placement_test",strict:true,schema:{type:"object",additionalProperties:false,properties:{questions:{type:"array",minItems:14,maxItems:14,items:{type:"object",additionalProperties:false,properties:{level:{type:"string",enum:["A0","A1","A2","B1","B2","C1","C2"]},question:{type:"string"},options:{type:"array",minItems:3,maxItems:3,items:{type:"string"}},answer:{type:"integer",minimum:0,maximum:2}},required:["level","question","options","answer"]}}},required:["questions"]}}}
  }),signal:controller.signal}); clearTimeout(timer);
  if(!r.ok){const body=await r.text();return res.status(502).json({error:"Assessment generation failed",detail:body.slice(0,500)})}
  const data=await r.json(); const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
  if(!text) return res.status(502).json({error:"No assessment returned"});
  const parsed=JSON.parse(text);
  if(!parsed.questions||parsed.questions.length!==14) return res.status(502).json({error:"Incomplete assessment"});
  const expectedLevels=["A0","A1","A2","B1","B2","C1","C2"];
  const counts=Object.fromEntries(expectedLevels.map(level=>[level,0]));
  for(const q of parsed.questions){if(!counts[q.level]&&counts[q.level]!==0)return res.status(502).json({error:"Invalid assessment level"});counts[q.level]++;}
  if(expectedLevels.some(level=>counts[level]!==2)) return res.status(502).json({error:"Assessment level distribution was invalid"});
  return res.status(200).json(parsed);
 }catch(e){return res.status(500).json({error:e.name==="AbortError"?"Assessment timed out":e.message})}
}
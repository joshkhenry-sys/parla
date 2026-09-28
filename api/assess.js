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
Return exactly 14 multiple-choice questions: exactly 2 labeled A0, exactly 2 labeled A1, exactly 2 labeled A2, exactly 2 labeled B1, exactly 2 labeled B2, exactly 2 labeled C1, and exactly 2 labeled C2. The questions should become genuinely more sophisticated as the level rises.
Questions must test the TARGET LANGUAGE, not English. Show target-language phrases/examples where useful, but write the question/instructions in English.
Avoid trivial alphabet/greeting questions. For B1 and above test real everyday language, tense/aspect, connectors, idioms, implied meaning, register, conversational nuance, and natural phrasing. For C1/C2 make the distinction meaningful.
Each question must have exactly 3 answer choices and exactly one correct answer.
Do not translate everything into English; the target-language evidence should be what the learner is being tested on.
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
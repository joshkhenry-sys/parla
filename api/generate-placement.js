const MODEL="gpt-5.6-luna";
const LANGUAGE_CODES={
 Spanish:"es",English:"en",Portuguese:"pt",French:"fr",Italian:"it",German:"de",
 Japanese:"ja",Korean:"ko",Mandarin:"zh",Arabic:"ar",Dutch:"nl",Swedish:"sv",
 Greek:"el",Turkish:"tr",Hindi:"hi",Polish:"pl"
};
const LEVELS=["A1","A2","B1","B2","C1","C2"];
function jsonResponse(res,status,payload){return res.status(status).json(payload)}
export default async function handler(req,res){
  if(req.method!=="POST")return jsonResponse(res,405,{error:"Method not allowed"});
  const language=String(req.body?.language||"").trim();
  const code=LANGUAGE_CODES[language];
  if(!code)return jsonResponse(res,400,{error:"Unsupported language"});
  if(!process.env.OPENAI_API_KEY)return jsonResponse(res,503,{error:"Placement test is temporarily unavailable."});
  const prompt=`Create a free Nahtive CEFR placement test for an adult learner of ${language}.
Generate exactly 12 multiple-choice questions: 2 A1, 2 A2, 2 B1, 2 B2, 2 C1, 2 C2.
The questions must measure actual language ability, not trivia. Use natural modern language from ${language}.
For A1/A2 test practical comprehension and basic grammar/vocabulary.
For B1 test connected language, everyday reasoning, past/future, comparison and problem solving.
For B2 test nuanced everyday communication, collocations, opinion, conditionals and flexible grammar.
For C1 test precision, register, idiomatic/collocational language, implication and complex structures.
For C2 test subtle pragmatic meaning, register, idiomaticity and fine distinctions.
Do not reuse the same phrase across questions. Do not make higher-level questions merely longer; they must require higher-level language knowledge.
Each question has exactly 4 answers and exactly one correct answer.
Question text and answer choices must be in ${language}. Include a short English skill note for internal scoring only.
Return JSON only.`;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:MODEL,input:prompt,reasoning:{effort:"low"},max_output_tokens:5000,text:{format:{type:"json_schema",name:"nahtive_placement",strict:true,schema:{
        type:"object",additionalProperties:false,properties:{
          language:{type:"string"},
          questions:{type:"array",minItems:12,maxItems:12,items:{type:"object",additionalProperties:false,properties:{
            level:{type:"string",enum:LEVELS},
            question:{type:"string"},
            choices:{type:"array",minItems:4,maxItems:4,items:{type:"string"}},
            correct_index:{type:"integer",minimum:0,maximum:3},
            skill:{type:"string"}
          },required:["level","question","choices","correct_index","skill"]}}
        },required:["language","questions"]
      }}})});
    if(!response.ok)return jsonResponse(res,502,{error:"Could not create placement test"});
    const data=await response.json();
    const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
    if(!text)throw new Error("No placement test returned");
    const parsed=JSON.parse(text);
    if(!Array.isArray(parsed.questions)||parsed.questions.length!==12)throw new Error("Invalid placement test");
    const seen=new Set();
    for(const q of parsed.questions){
      if(!LEVELS.includes(q.level)||!q.question||!Array.isArray(q.choices)||q.choices.length!==4||q.correct_index<0||q.correct_index>3)throw new Error("Invalid placement question");
      const key=q.level;
      seen.add(key);
    }
    if(LEVELS.some(l=>!seen.has(l)))throw new Error("Missing placement level");
    return jsonResponse(res,200,{language,code,questions:parsed.questions});
  }catch(e){
    console.error("Placement generation failed:",e);
    return jsonResponse(res,500,{error:"Could not create placement test"});
  }
}
const MODEL="gpt-4o-mini";
const LANGUAGE_CODES={
 Spanish:"es",English:"en",Portuguese:"pt",French:"fr",Italian:"it",German:"de",
 Japanese:"ja",Korean:"ko",Mandarin:"zh",Arabic:"ar",Dutch:"nl",Swedish:"sv",
 Greek:"el",Turkish:"tr",Hindi:"hi",Polish:"pl"
};
const LEVELS=["A1","A2","B1","B2","C1","C2"];
function jsonResponse(res,status,payload){return res.status(status).json(payload)}
function extractOutputText(data){
  if(typeof data?.output_text==="string"&&data.output_text.trim())return data.output_text.trim();
  const parts=[];
  for(const item of Array.isArray(data?.output)?data.output:[]){
    for(const part of Array.isArray(item?.content)?item.content:[]){
      if(part?.type==="output_text"&&typeof part.text==="string")parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}
function validatePlacement(parsed){
  if(!parsed||!Array.isArray(parsed.questions)||parsed.questions.length!==18)throw new Error("Invalid placement test");
  const counts=Object.fromEntries(LEVELS.map(l=>[l,0]));
  for(const q of parsed.questions){
    if(!LEVELS.includes(q?.level)||!String(q.question||"").trim()||!Array.isArray(q.choices)||q.choices.length!==4||new Set(q.choices.map(String)).size!==4||!Number.isInteger(q.correct_index)||q.correct_index<0||q.correct_index>3)throw new Error("Invalid placement question");
    counts[q.level]++;
  }
  if(LEVELS.some(l=>counts[l]!==3))throw new Error("Placement test must contain exactly three questions at each level");
  const normalized=parsed.questions.map(q=>String(q.question).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\\s+/g," ").trim());
  if(new Set(normalized).size!==normalized.length)throw new Error("Placement test contains repeated questions");
  for(let i=0;i<parsed.questions.length;i++)for(let j=i+1;j<parsed.questions.length;j++){
    const a=new Set(normalized[i].split(" ")),b=new Set(normalized[j].split(" "));
    const overlap=[...a].filter(w=>w.length>3&&b.has(w)).length/Math.max(1,Math.min(a.size,b.size));
    if(overlap>.78)throw new Error("Placement test contains near-duplicate questions");
  }
  return parsed.questions;
}
export default async function handler(req,res){
  if(req.method!=="POST")return jsonResponse(res,405,{error:"Method not allowed"});
  const language=String(req.body?.language||"").trim();
  const instructionLanguage=String(req.body?.instructionLanguage||"English").trim();
  const code=LANGUAGE_CODES[language];
  if(!code)return jsonResponse(res,400,{error:"Unsupported language"});
  if(!process.env.OPENAI_API_KEY)return jsonResponse(res,503,{error:"Placement test is temporarily unavailable."});
  const prompt=`Create a free Nahtive CEFR placement test for an adult learner of ${language}.
Generate exactly 18 multiple-choice questions: 3 A1, 3 A2, 3 B1, 3 B2, 3 C1, 3 C2.
The questions must measure actual language ability, not trivia. Use natural modern language from ${language}.
For A1/A2 test practical comprehension and basic grammar/vocabulary.
For B1 test connected language, everyday reasoning, past/future, comparison and problem solving.
For B2 test nuanced everyday communication, collocations, opinion, conditionals and flexible grammar.
For C1 test precision, register, idiomatic/collocational language, implication and complex structures.
For C2 test subtle pragmatic meaning, register, idiomaticity and fine distinctions.
Do not reuse the same phrase, scenario, grammatical target, answer pattern, or communicative function across questions. Every question must test a distinct skill in a distinct realistic situation. Avoid templates with only names or nouns swapped. Do not make higher-level questions merely longer; they must require higher-level language knowledge.
A1 questions must be genuinely accessible to a beginner: common everyday situations, high-frequency words, and clear sentence structures. A2 should be slightly more demanding but still practical and concrete.
Every wrong answer must be a plausible distractor: use realistic learner mistakes, near-miss grammar, wrong word choice, or a response that could make sense in another context. Never use random word salad, obviously broken sentences, or absurd distractors that make the correct answer easy to spot.
Each question has exactly 4 answers and exactly one correct answer.
Question text and answer choices must be in ${language}. Also provide an accurate, concise translation of each question into ${instructionLanguage}, in a field named question_translation. Translate the question/prompt only, not the answer choices; the target-language answer choices must remain in ${language} so the test still measures the learner's ability. The translation must never reveal or imply the correct answer. Translate the question into ${instructionLanguage} naturally and clearly, including script and punctuation appropriate to that language.
Include a short skill note in English for internal scoring only.
Return JSON only.`;
  try{
    const schema={
      type:"object",additionalProperties:false,properties:{
        language:{type:"string"},
        questions:{type:"array",minItems:18,maxItems:18,items:{type:"object",additionalProperties:false,properties:{
          level:{type:"string",enum:LEVELS},
          question:{type:"string"},
          choices:{type:"array",minItems:4,maxItems:4,items:{type:"string"}},
          correct_index:{type:"integer",minimum:0,maximum:3},
          question_translation:{type:"string"},
          skill:{type:"string"}
        },required:["level","question","choices","correct_index","question_translation","skill"]}}
      },required:["language","questions"]
    };
    let lastError=null;
    for(let attempt=1;attempt<=1;attempt++){
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetch("https://api.openai.com/v1/responses",{
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
          signal:controller.signal,
          body:JSON.stringify({model:MODEL,input:prompt,reasoning:{effort:"low"},max_output_tokens:9000,text:{format:{type:"json_schema",name:"nahtive_placement",strict:true,schema}}})
        });
        const raw=await response.text();
        if(!response.ok){
          console.error("OpenAI placement error:",response.status,raw.slice(0,1200));
          lastError=new Error("OpenAI request failed");
          continue;
        }
        let data;
        try{data=JSON.parse(raw)}catch(e){lastError=new Error("OpenAI returned invalid JSON");continue}
        const output=extractOutputText(data);
        if(!output){lastError=new Error("No placement test returned");continue}
        let parsed;
        try{parsed=JSON.parse(output)}catch(e){lastError=new Error("Placement output was not valid JSON");continue}
        try{
          const questions=validatePlacement(parsed);
          return jsonResponse(res,200,{language,code,instructionLanguage,questions});
        }catch(e){lastError=e;continue}
      }catch(e){
        lastError=e?.name==="AbortError"?new Error("Placement generation timed out"):e;
      }finally{
        clearTimeout(timer);
      }
    }
    throw lastError||new Error("Could not create placement test");
  }catch(e){
    console.error("Placement generation failed:",e);
    return jsonResponse(res,502,{error:"Could not create placement test. Please try again."});
  }
}
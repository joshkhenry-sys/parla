const MODEL="gpt-4o-mini";
function json(res,status,payload){return res.status(status).json(payload)}
export default async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const body=req.body||{};
  const language=String(body.language||"").slice(0,80);
  const level=String(body.level||"A1").toUpperCase();
  const nativeLanguage=String(body.nativeLanguage||"English").slice(0,80);
  const goal=String(body.goal||"").slice(0,240);
  const situation=String(body.situation||"").slice(0,600);
  const prompt=String(body.prompt||"").slice(0,600);
  const modelAnswer=String(body.modelAnswer||"").slice(0,600);
  const responseText=String(body.response||"").trim().slice(0,1200);
  const phrases=Array.isArray(body.phrases)?body.phrases.slice(0,5).map(x=>({target:String(x.target||"").slice(0,200),meaning:String(x.meaning||"").slice(0,240)})):[];
  if(!language||!situation||!prompt||!responseText||!phrases.length)return json(res,400,{error:"Missing practice response"});
  if(!process.env.OPENAI_API_KEY)return json(res,200,{rating:"keep_practicing",feedback:"Compare your response with the model answer. Notice one phrase you can reuse, then try again in your own words.",correction:modelAnswer,nextFocus:"Try the situation again without copying the model."});
  const instructions=`You are Nahtive, a supportive but honest language practice coach. Evaluate a learner's short response in ${language} at CEFR ${level}. Their explanation language is ${nativeLanguage}. Target goal: ${goal||"communicate in a realistic everyday situation"}.
Situation: ${situation}
Task: ${prompt}
Taught phrases (target language with meanings): ${JSON.stringify(phrases)}
Model answer (one valid example, not the only acceptable answer): ${modelAnswer}
Learner response: ${responseText}
Judge whether the response communicates the task's intent, is understandable, and is appropriate to the level. Do not require exact matching to the model. Accept valid alternatives and minor errors that do not impede meaning. If blank or unrelated, say so kindly. Give specific actionable feedback in ${nativeLanguage}, a natural corrected version in ${language}, and one concise next practice focus. Avoid generic praise. Never claim fluency or mastery from one answer. Return JSON only.`;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),18000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:MODEL,input:instructions,max_output_tokens:700,text:{format:{type:"json_schema",name:"practice_feedback",strict:true,schema:{type:"object",additionalProperties:false,properties:{rating:{type:"string",enum:["strong","understandable","keep_practicing"]},feedback:{type:"string"},correction:{type:"string"},nextFocus:{type:"string"}},required:["rating","feedback","correction","nextFocus"]}}}),signal:controller.signal});
    if(!response.ok){console.error("Practice evaluation failed",await response.text());return json(res,502,{error:"Feedback unavailable; your response has not been lost."})}
    const data=await response.json();const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
    if(!text)throw new Error("No feedback returned");
    const parsed=JSON.parse(text);
    if(!["strong","understandable","keep_practicing"].includes(parsed.rating)||!parsed.feedback||!parsed.correction||!parsed.nextFocus)throw new Error("Invalid feedback");
    return json(res,200,parsed);
  }catch(error){console.error("Practice evaluation error",error);return json(res,502,{error:"Feedback could not be generated. Please retry."})}
  finally{clearTimeout(timeout)}
}

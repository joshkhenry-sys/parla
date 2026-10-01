const MODEL="gpt-5.6-luna";

const FALLBACKS={
  es:[["Hola","Hello","Use this to greet someone.","Hola, soy Alex.","HO-la"],["Me llamo ___","My name is ___.","Use this to tell someone your name.","Me llamo Alex.","meh YAH-moh Alex"]],
  fr:[["Bonjour","Hello.","Use this to greet someone politely.","Bonjour, je m'appelle Alex.","bohn-ZHOOR"],["Je m'appelle ___","My name is ___.","Use this to tell someone your name.","Je m'appelle Alex.","zhuh mah-PELL Alex"]],
  pl:[["Cześć","Hi / Hello.","Use this to greet someone you know or in a casual situation.","Cześć, jestem Alex.","cheshch"],["Mam na imię ___","My name is ___.","Use this to tell someone your name.","Mam na imię Alex.","mam nah EE-myeh Alex"]],
  pt:[["Oi","Hi / Hello.","Use this to greet someone.","Oi, eu sou o Alex.","oy"],["Eu me chamo ___","My name is ___.","Use this to tell someone your name.","Eu me chamo Alex.","eh-oo mee SHAH-moo Alex"]],
  de:[["Hallo","Hello.","Use this to greet someone.","Hallo, ich bin Alex.","HAH-loh"],["Ich heiße ___","My name is ___.","Use this to tell someone your name.","Ich heiße Alex.","ikh HIGH-suh Alex"]],
  it:[["Ciao","Hi / Hello.","Use this to greet someone.","Ciao, sono Alex.","CHOW"],["Mi chiamo ___","My name is ___.","Use this to tell someone your name.","Mi chiamo Alex.","mee KYAH-moh Alex"]],
  nl:[["Hoi","Hi / Hello.","Use this to greet someone.","Hoi, ik ben Alex.","hoy"],["Ik heet ___","My name is ___.","Use this to tell someone your name.","Ik heet Alex.","ik hayt Alex"]],
  sv:[["Hej","Hi / Hello.","Use this to greet someone.","Hej, jag heter Alex.","hey"],["Jag heter ___","My name is ___.","Use this to tell someone your name.","Jag heter Alex.","yahg HAY-ter Alex"]],
  el:[["Γεια σου","Hi / Hello.","Use this to greet someone casually.","Γεια σου, είμαι ο Alex.","ya sou"],["Με λένε ___","My name is ___.","Use this to tell someone your name.","Με λένε Alex.","meh LEH-neh Alex"]],
  tr:[["Merhaba","Hello.","Use this to greet someone.","Merhaba, ben Alex.","mehr-ha-ba"],["Benim adım ___","My name is ___.","Use this to tell someone your name.","Benim adım Alex.","beh-neem ah-duhm Alex"]],
  hi:[["नमस्ते","Hello.","Use this to greet someone politely.","नमस्ते, मैं Alex हूँ।","namaste"],["मेरा नाम ___ है","My name is ___.","Use this to tell someone your name.","मेरा नाम Alex है।","mera naam Alex hai"]],
  ja:[["こんにちは","Hello.","Use this to greet someone politely.","こんにちは、アレックスです。","konnichiwa"],["私は___です","I am ___.","Use this to introduce yourself.","私はアレックスです。","watashi wa Alex desu"]],
  ko:[["안녕하세요","Hello.","Use this to greet someone politely.","안녕하세요, 저는 Alex예요.","annyeonghaseyo"],["저는 ___예요","I am ___.","Use this to introduce yourself.","저는 Alex예요.","jeoneun Alex-yeyo"]],
  zh:[["你好","Hello.","Use this to greet someone.","你好，我叫 Alex。","nǐ hǎo"],["我叫 ___","My name is ___.","Use this to tell someone your name.","我叫 Alex。","wǒ jiào Alex"]],
  ar:[["مرحبا","Hello.","Use this to greet someone.","مرحبا، أنا أليكس.","marhaban"],["اسمي ___","My name is ___.","Use this to tell someone your name.","اسمي أليكس.","ismi Alex"]]
};

function fallbackLesson(language,code,level,node){
  const rows=FALLBACKS[String(code||"").toLowerCase()]||[["Hi","Hello.","Use this to greet someone.","Hi, I'm Alex.","hi"],["My name is ___","My name is ___.","Use this to tell someone your name.","My name is Alex.","my name iz Alex"]];
  const phrases=rows.map(([target,meaning,usage,example,pronunciation])=>({
    target,meaning,usage,
    breakdown:[{target,meaning}],
    example,example_meaning:meaning,pronunciation
  }));
  return {
    title:String(node?.title||"Meet someone"),
    topic:String(node?.focus||"introductions"),
    scene:{time:"Right now",place:String(node?.title||"Everyday life"),mission:String(node?.situation||"Say hello and introduce yourself."),situation:String(node?.situation||"Meet someone and start a very short conversation.")},
    phrases,
    dialogue:[
      {speaker:"native",text:phrases[0].target},
      {speaker:"learner",text:phrases[1].target},
      {speaker:"native",text:phrases[0].target},
      {speaker:"learner",text:phrases[1].target}
    ]
  };
}

function jsonResponse(res,status,payload){return res.status(status).json(payload);}

export default async function handler(req,res){
  let language="",code="",level="",node=null;
  try{
    if(req.method!=="POST")return jsonResponse(res,405,{error:"Method not allowed"});
    if(!process.env.OPENAI_API_KEY)return jsonResponse(res,500,{error:"Missing OPENAI_API_KEY"});
    ({language,code,level,node}=req.body||{});
    if(!language||!code||!level||!node?.sequence_number||!node?.title||!node?.situation)return jsonResponse(res,400,{error:"Missing lesson generation inputs"});

    const normalizedLevel=String(level).toUpperCase();
    const isA0=normalizedLevel==="A0";
    const levelRules=isA0
      ? "A0 means absolute beginner. Assume the learner knows almost nothing. Teach only 2 very short, immediately useful phrases. Each phrase should normally be 1-6 words. Introduce no more than about 5 new lexical items total. Do not use idioms, slang, abstract vocabulary, long sentences, unexplained conjugations, complex grammar, or culturally specific shortcuts. If a phrase changes form because of gender, case, politeness, contraction, or conjugation, explain that plainly in the breakdown. The learner must know exactly what the whole phrase means before being asked to say it. Do not make the learner infer meaning from the situation."
      : normalizedLevel==="A1"
      ? "A1 means early beginner. Use very common everyday language and short sentences. Build from structures the learner could realistically reuse. Avoid B1+ vocabulary, idioms, slang, and complicated grammar. Explain every important new word or grammatical change in plain English."
      : "Match "+normalizedLevel+" closely. Complexity should come from the learner's level, not from trying to sound sophisticated.";

    const prompt=[
      "You are designing one Nahtive lesson for an adult learning ",language,".\n\n",
      "TARGET LANGUAGE: ",language," (",code,")\n",
      "LEVEL: ",normalizedLevel,"\n",
      "CURRICULUM: ",node.sequence_number,"/100\n",
      "SITUATION: ",node.title,"\n",
      "SCENARIO: ",node.situation,"\n",
      "FOCUS: ",node.focus||"everyday conversation","\n\n",
      "LEVEL RULES:\n",levelRules,"\n\n",
      "THE MOST IMPORTANT RULE:\n",
      "The learner must understand what they are saying before they are asked to produce it. Every taught phrase needs a clear natural English meaning, when a real person uses it, a word/part breakdown when useful, a natural example in the target language, and the English meaning of that example. The lesson should feel like a patient native speaker teaching one tiny useful situation, not a vocabulary test.\n\n",
      "LANGUAGE:\n",
      "Target-language content must be genuinely natural for native speakers. English is used for explanations and translations. Spanish must be contemporary Latin American / broadly American Spanish, never Spain-specific. Polish must explain relevant endings/case changes instead of expecting the learner to guess. French must explain contractions/articles or other changes when they matter. Never translate English literally if native speakers would phrase it differently.\n\n",
      "PHRASES:\nReturn exactly 2. Phrase 1 is the essential phrase for the situation. Phrase 2 is a simple response, variation, or reusable sentence frame. Do not sneak extra new vocabulary into examples just to make them sound impressive.\n\n",
      "DIALOGUE:\nReturn exactly 4 lines in this order: native, learner, native, learner. It must model the same situation using the taught language. At A0, keep every line extremely short. Do not put unexplained advanced target-language sentences into the learner's lines.\n\n",
      "OUTPUT:\nReturn valid JSON matching the required schema only."
    ].join("");

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    let response;
    try{
      response=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
        body:JSON.stringify({
          model:MODEL,input:prompt,reasoning:{effort:"low"},max_output_tokens:1400,
          text:{format:{type:"json_schema",name:"nahtive_lesson",strict:true,schema:{
            type:"object",additionalProperties:false,
            properties:{
              title:{type:"string"},topic:{type:"string"},
              scene:{type:"object",additionalProperties:false,properties:{time:{type:"string"},place:{type:"string"},mission:{type:"string"},situation:{type:"string"}},required:["time","place","mission","situation"]},
              phrases:{type:"array",minItems:2,maxItems:2,items:{type:"object",additionalProperties:false,properties:{
                target:{type:"string"},meaning:{type:"string"},usage:{type:"string"},
                breakdown:{type:"array",minItems:1,maxItems:5,items:{type:"object",additionalProperties:false,properties:{target:{type:"string"},meaning:{type:"string"}},required:["target","meaning"]}},
                example:{type:"string"},example_meaning:{type:"string"},pronunciation:{type:"string"}
              },required:["target","meaning","usage","breakdown","example","example_meaning","pronunciation"]}},
              dialogue:{type:"array",minItems:4,maxItems:4,items:{type:"object",additionalProperties:false,properties:{speaker:{type:"string",enum:["native","learner"]},text:{type:"string"}},required:["speaker","text"]}}
            },
            required:["title","topic","scene","phrases","dialogue"]
          }}}
        }),
        signal:controller.signal
      });
    }finally{clearTimeout(timeout);}

    if(!response.ok){
      console.error("OpenAI lesson generation failed:",await response.text());
      return jsonResponse(res,200,{title:String(node.title),topic:String(node.focus||"real conversation"),content:fallbackLesson(language,code,level,node),fallback:true});
    }

    const data=await response.json();
    const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
    if(!text)throw new Error("OpenAI returned no lesson text");
    const parsed=JSON.parse(text);
    if(!Array.isArray(parsed.phrases)||parsed.phrases.length!==2)throw new Error("Invalid phrase count");
    if(parsed.phrases.some(p=>!p.target||!p.meaning||!p.usage||!p.example||!p.example_meaning||!Array.isArray(p.breakdown)||!p.breakdown.length))throw new Error("Incomplete phrase teaching data");
    if(!Array.isArray(parsed.dialogue)||parsed.dialogue.length!==4)throw new Error("Invalid dialogue count");
    const expected=["native","learner","native","learner"];
    if(parsed.dialogue.some((line,i)=>line.speaker!==expected[i]))throw new Error("Invalid dialogue order");

    return jsonResponse(res,200,{title:parsed.title,topic:parsed.topic,content:parsed});
  }catch(e){
    console.error("Lesson generation exception:",e);
    return jsonResponse(res,200,{title:String(node?.title||"Your first conversation"),topic:String(node?.focus||"real conversation"),content:fallbackLesson(language,code,level,node),fallback:true,error:String(e?.message||"Generation failed")});
  }
}
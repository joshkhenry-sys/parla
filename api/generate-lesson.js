const MODEL="gpt-4o-mini";
const FALLBACKS={
 en:[["Hi","Hello.","Use this to greet someone naturally.","Hi, I'm Alex.","hy"],["How's it going?","How are you?","Use this in casual conversation.","Hey, how's it going?","howz it GO-ing"],["I'm doing pretty well.","I'm doing well.","Use this to answer naturally.","I'm doing pretty well, thanks.","im DOO-ing PRIT-ee well"],["What have you been up to?","What have you been doing lately?","Use this to keep a conversation going.","So, what have you been up to?","wut uv yoo bin UP-too"],["Sounds good to me.","That works for me.","Use this when agreeing to a plan or suggestion.","Friday works. Sounds good to me.","soundz good tuh mee"]],
 es:[["Hola","Hello.","Use this to greet someone.","Hola, soy Alex.","HO-la"],["¿Cómo estás?","How are you?","Use this to ask how someone is doing.","Hola, ¿cómo estás?","KOH-moh es-TAHS"],["Estoy bien.","I'm good.","Use this to say how you are.","Estoy bien, gracias.","es-TOY byen"],["Me llamo Alex.","My name is Alex.","Use this to introduce yourself.","Hola, me llamo Alex.","meh YAH-moh"],["Mucho gusto.","Nice to meet you.","Use this after meeting someone.","Mucho gusto.","MOO-cho GOOS-toh"]],
 fr:[["Bonjour","Hello.","Use this to greet someone.","Bonjour, je m'appelle Alex.","bohn-ZHOOR"],["Comment ça va ?","How are you?","Use this to ask how someone is doing.","Bonjour, comment ça va ?","koh-MAHN sah vah"],["Ça va bien.","I'm doing well.","Use this to answer.","Ça va bien, merci.","sah vah byen"],["Je m'appelle Alex.","My name is Alex.","Use this to introduce yourself.","Je m'appelle Alex.","zhuh mah-PELL"],["Enchanté.","Nice to meet you.","Use this after meeting someone.","Enchanté.","ahn-shahn-TAY"]],
 de:[["Hallo","Hello.","Use this to greet someone.","Hallo, ich bin Alex.","HAH-loh"],["Wie geht's?","How are you?","Use this casually with someone.","Wie geht's dir?","vee gates"],["Mir geht's gut.","I'm good.","Use this to answer.","Mir geht's gut, danke.","meer gates goot"],["Ich heiße Alex.","My name is Alex.","Use this to introduce yourself.","Ich heiße Alex.","ikh HIGH-suh"],["Freut mich.","Nice to meet you.","Use this when meeting someone.","Freut mich.","froyt mish"]],
 pt:[["Oi","Hi.","Use this to greet someone.","Oi, eu sou o Alex.","oy"],["Tudo bem?","How are you?","Use this casually.","Oi, tudo bem?","TOO-doh beng"],["Tudo bem.","I'm good.","Use this to answer.","Tudo bem, obrigado.","TOO-doh beng"],["Eu me chamo Alex.","My name is Alex.","Use this to introduce yourself.","Eu me chamo Alex.","eh-oo mee SHAH-moo"],["Prazer.","Nice to meet you.","Use this after meeting someone.","Prazer em conhecer você.","prah-ZEHR"]],
 it:[["Ciao","Hi.","Use this to greet someone.","Ciao, sono Alex.","CHOW"],["Come stai?","How are you?","Use this casually.","Ciao, come stai?","KOH-meh stai"],["Sto bene.","I'm good.","Use this to answer.","Sto bene, grazie.","stoh BEH-neh"],["Mi chiamo Alex.","My name is Alex.","Use this to introduce yourself.","Mi chiamo Alex.","mee KYAH-moh"],["Piacere.","Nice to meet you.","Use this after meeting someone.","Piacere di conoscerti.","pya-CHEH-reh"]],
 nl:[["Hoi","Hi.","Use this to greet someone.","Hoi, ik ben Alex.","hoy"],["Hoe gaat het?","How are you?","Use this to ask.","Hoe gaat het met je?","hoo gaat ut"],["Het gaat goed.","I'm good.","Use this to answer.","Het gaat goed, dank je.","het gaat goot"],["Ik heet Alex.","My name is Alex.","Use this to introduce yourself.","Ik heet Alex.","ik hayt"],["Leuk je te ontmoeten.","Nice to meet you.","Use this after meeting someone.","Leuk je te ontmoeten.","loyk yuh tuh ont-MOO-tun"]],
 pl:[["Cześć","Hi.","Use this casually.","Cześć, jestem Alex.","cheshch"],["Jak się masz?","How are you?","Use this casually.","Cześć, jak się masz?","yak shyeh mash"],["Mam się dobrze.","I'm good.","Use this to answer.","Mam się dobrze, dzięki.","mam shyeh DOH-bzheh"],["Mam na imię Alex.","My name is Alex.","Use this to introduce yourself.","Mam na imię Alex.","mam nah EE-myeh"],["Miło mi.","Nice to meet you.","Use this after meeting someone.","Miło mi cię poznać.","MEE-woh mee"]],
 sv:[["Hej","Hi.","Use this to greet someone.","Hej, jag heter Alex.","hey"],["Hur mår du?","How are you?","Use this casually.","Hej, hur mår du?","hoor mor doo"],["Jag mår bra.","I'm good.","Use this to answer.","Jag mår bra, tack.","yahg mor brah"],["Jag heter Alex.","My name is Alex.","Use this to introduce yourself.","Jag heter Alex.","yahg HAY-ter"],["Trevligt att träffas.","Nice to meet you.","Use this after meeting someone.","Trevligt att träffas.","TREV-lit"]],
 tr:[["Merhaba","Hello.","Use this to greet someone.","Merhaba, ben Alex.","mehr-ha-ba"],["Nasılsın?","How are you?","Use this casually.","Merhaba, nasılsın?","NAH-suhl-suhn"],["İyiyim.","I'm good.","Use this to answer.","İyiyim, teşekkürler.","ee-YEE-yeem"],["Benim adım Alex.","My name is Alex.","Use this to introduce yourself.","Benim adım Alex.","beh-neem ah-duhm"],["Memnun oldum.","Nice to meet you.","Use this after meeting someone.","Memnun oldum.","mem-NOON old-oom"]],
 el:[["Γεια σου","Hi.","Use this casually.","Γεια σου, είμαι ο Alex.","ya sou"],["Τι κάνεις;","How are you?","Use this casually.","Γεια σου, τι κάνεις;","tee KAH-nees"],["Είμαι καλά.","I'm good.","Use this to answer.","Είμαι καλά, ευχαριστώ.","EE-meh ka-LA"],["Με λένε Alex.","My name is Alex.","Use this to introduce yourself.","Με λένε Alex.","meh LEH-neh"],["Χάρηκα.","Nice to meet you.","Use this after meeting someone.","Χάρηκα πολύ.","HA-ree-ka"]],
 hi:[["नमस्ते","Hello.","Use this politely.","नमस्ते, मैं Alex हूँ।","namaste"],["आप कैसे हैं?","How are you?","Use this politely.","आप कैसे हैं?","aap kaise hain"],["मैं ठीक हूँ।","I'm good.","Use this to answer.","मैं ठीक हूँ, धन्यवाद।","main theek hoon"],["मेरा नाम Alex है।","My name is Alex.","Use this to introduce yourself.","मेरा नाम Alex है।","mera naam Alex hai"],["आपसे मिलकर खुशी हुई।","Nice to meet you.","Use this after meeting someone.","आपसे मिलकर खुशी हुई।","aapse milkar khushi hui"]],
 ja:[["こんにちは","Hello.","Use this politely.","こんにちは、アレックスです。","konnichiwa"],["元気ですか？","How are you?","Use this to ask.","元気ですか？","genki desu ka"],["元気です。","I'm good.","Use this to answer.","元気です、ありがとう。","genki desu"],["私はアレックスです。","I am Alex.","Use this to introduce yourself.","私はアレックスです。","watashi wa Alex desu"],["はじめまして。","Nice to meet you.","Use this when meeting someone.","はじめまして、よろしくお願いします。","hajimemashite"]],
 ko:[["안녕하세요","Hello.","Use this politely.","안녕하세요, 저는 Alex예요.","annyeonghaseyo"],["어떻게 지내세요?","How are you?","Use this politely.","요즘 어떻게 지내세요?","eotteoke jinaeseyo"],["잘 지내요.","I'm doing well.","Use this to answer.","잘 지내요, 감사합니다.","jal jinaeyo"],["저는 Alex예요.","I am Alex.","Use this to introduce yourself.","저는 Alex예요.","jeoneun Alex-yeyo"],["만나서 반가워요.","Nice to meet you.","Use this after meeting someone.","만나서 반가워요.","mannaseo bangawoyo"]],
 zh:[["你好","Hello.","Use this to greet someone.","你好，我叫 Alex。","nǐ hǎo"],["你好吗？","How are you?","Use this to ask.","你好，你好吗？","nǐ hǎo ma"],["我很好。","I'm good.","Use this to answer.","我很好，谢谢。","wǒ hěn hǎo"],["我叫 Alex。","My name is Alex.","Use this to introduce yourself.","我叫 Alex。","wǒ jiào Alex"],["很高兴认识你。","Nice to meet you.","Use this after meeting someone.","很高兴认识你。","hěn gāoxìng rènshi nǐ"]],
 ar:[["مرحبا","Hello.","Use this to greet someone.","مرحبا، أنا أليكس.","marhaban"],["كيف حالك؟","How are you?","Use this to ask.","مرحبا، كيف حالك؟","kayfa haluk"],["أنا بخير.","I'm good.","Use this to answer.","أنا بخير، شكرا.","ana bikhayr"],["اسمي أليكس.","My name is Alex.","Use this to introduce yourself.","اسمي أليكس.","ismi Alex"],["تشرفت بلقائك.","Nice to meet you.","Use this after meeting someone.","تشرفت بلقائك.","tasharraftu biliqaik"]]
};
function fallbackLesson(language,code,level,node){
 const raw=String(code||"").toLowerCase();
 const key=raw.split("-")[0];
 const rows=FALLBACKS[raw]||FALLBACKS[key]||FALLBACKS.en;
 const ps=rows.map(([target,meaning,usage,example,pronunciation],i)=>({
   target,meaning,usage,
   breakdown:[{target,meaning}],
   example,example_meaning:meaning,pronunciation,
   build_target:target,build_meaning:meaning,
   build_words:target.split(/\s+/).filter(Boolean),
   distractors:rows.filter((_,j)=>j!==i).slice(0,4).map(r=>String(r[0]||"")).filter(Boolean)
 }));
 return {
   language_code:String(code||"").toLowerCase(),language_name:String(language||""),level:String(level||""),
   title:String(node?.title||"Your first conversation"),
   topic:String(node?.focus||"Everyday conversation"),
   scene:{time:"Right now",place:String(node?.title||"Everyday life"),mission:String(node?.situation||"Handle a simple real-world interaction."),situation:String(node?.situation||"Practice a short, useful interaction.")},
   phrases:ps,
   dialogue:ps.slice(0,4).map((p,i)=>({speaker:i%2?"learner":"native",text:p.target})),
   final_challenge:{
     situation:String(node?.situation||"Practice this situation in a real conversation."),
     prompt:"Respond to the person in this situation using the language you just learned.",
     choices:[ps[4].target,ps[0].target,ps[1].target,ps[2].target],
     correct_answer:ps[4].target
   }
 };
}
function jsonResponse(res,status,payload){return res.status(status).json(payload)}
export default async function handler(req,res){
 let language="",code="",level="",nativeLanguage="English",node=null;
 try{
  if(req.method!=="POST")return jsonResponse(res,405,{error:"Method not allowed"});
  ({language,code,level,nativeLanguage="English",node}=req.body||{});
  level=String(level||"A1").toUpperCase();
  if(!["A1","A2","B1","B2","C1","C2"].includes(level))return jsonResponse(res,400,{error:"Unsupported CEFR level"});
  if(!language||!code||!node?.sequence_number||!node?.title||!node?.situation)return jsonResponse(res,400,{error:"Missing lesson generation inputs"});
  if(!process.env.OPENAI_API_KEY)return jsonResponse(res,200,{title:String(node.title),topic:String(node.focus||"real conversation"),content:fallbackLesson(language,code,level,node),fallback:true});
  const L=level;
  const rules={
   A1:"TRUE A1. Focus on immediate personal needs: greetings, identity, very simple requests, basic descriptions, numbers, time, location and routine exchanges. Use short, predictable sentences and high-frequency vocabulary. Do not make the learner infer nuance. Do not artificially make A1 hard.",
   A2:"TRUE A2. Use familiar everyday situations with connected but still straightforward language: shopping, travel, appointments, plans, preferences, simple past/future and basic reasons. Require more than memorized greetings, but keep grammar and vocabulary common.",
   B1:"TRUE B1. The learner should communicate independently in familiar real-world situations. Across the five phrases, require meaningful connected language such as narrating an experience, explaining a reason, describing a problem, comparing options, making plans, or giving an opinion. At least 3 of 5 phrases must do this. Do not use beginner identity/greeting frames as core teaching targets.",
   B2:"TRUE B2. Require flexible conversation, explanation and spontaneous response. Use varied sentence structures, common collocations, opinion/argument language, hypothetical or conditional situations, negotiation, contrast and nuance. At least 3 of 5 phrases must require more than a single predictable sentence frame. Avoid A1/A2 survival language as core targets.",
   C1:"TRUE C1. Require precise, natural communication in demanding but realistic situations. Use register, implication, idiomatic or collocational language, reformulation, complex connected speech and nuanced distinctions. At least 3 of 5 phrases must contain a clear advanced feature. Avoid beginner/elementary teaching frames.",
   C2:"TRUE C2. Require near-fluent flexibility: subtle pragmatic meaning, idiomaticity, register shifts, humor/irony where natural, precise reformulation and nuanced choices. At least 3 of 5 phrases must require high-level interpretation or production. Never fill a C2 lesson with elementary survival phrases."
  }[L]||"Match the requested CEFR level exactly.";
  const beginnerPatterns={
   es:[/¿?cómo te llamas\??/i,/^me llamo\b/i,/^hola[!.]?$/i,/^¿?cómo estás\??$/i,/^estoy bien[!.]?$/i,/^soy\s+\w+[!.]?$/i,/^tengo\s+\d+\s*años[!.]?$/i,/^mucho gusto[!.]?$/i],
   en:[/^hello[!.]?$/i,/^hi[!.]?$/i,/^my name is\b/i,/^what'?s your name\??$/i,/^how are you\??$/i,/^i'?m fine[!.]?$/i,/^nice to meet you[!.]?$/i],
   fr:[/^bonjour[!.]?$/i,/^je m'appelle\b/i,/^comment ça va\??$/i,/^ça va bien[!.]?$/i,/^enchanté[!.]?$/i],
   de:[/^hallo[!.]?$/i,/^ich heiße\b/i,/^wie geht'?s\??$/i,/^mir geht'?s gut[!.]?$/i,/^freut mich[!.]?$/i],
   it:[/^ciao[!.]?$/i,/^mi chiamo\b/i,/^come stai\??$/i,/^sto bene[!.]?$/i,/^piacere[!.]?$/i],
   pt:[/^oi[!.]?$/i,/^eu me chamo\b/i,/^tudo bem\??$/i,/^tudo bem[!.]?$/i,/^prazer[!.]?$/i],
   nl:[/^hoi[!.]?$/i,/^ik heet\b/i,/^hoe gaat het\??$/i,/^het gaat goed[!.]?$/i],
   pl:[/^cześć[!.]?$/i,/^mam na imię\b/i,/^jak się masz\??$/i,/^mam się dobrze[!.]?$/i],
   sv:[/^hej[!.]?$/i,/^jag heter\b/i,/^hur mår du\??$/i,/^jag mår bra[!.]?$/i],
   tr:[/^merhaba[!.]?$/i,/^benim adım\b/i,/^nasılsın\??$/i,/^iyiyim[!.]?$/i],
   el:[/^γεια σου[!.]?$/i,/^με λένε\b/i,/^τι κάνεις\??$/i,/^είμαι καλά[!.]?$/i],
   hi:[/^नमस्ते[।.!]?$/i,/^मेरा नाम\b/i,/^आप कैसे हैं[?]?$/i,/^मैं ठीक हूँ[।.!]?$/i],
   ja:[/^こんにちは[。.!]?$/i,/^元気ですか[？?]?$/i,/^私は.*です[。.!]?$/i],
   ko:[/^안녕하세요[.!]?$/i,/^어떻게 지내세요[?]?$/i,/^저는 .*예요[.!]?$/i],
   zh:[/^你好[！!。.]?$/i,/^你好吗[？?]?$/i,/^我叫\b/i],
   ar:[/^مرحبا[!.؟]?$/i,/^كيف حالك[؟?]?$/i,/^اسمي\b/i]
  };
  const phraseCount=5;
  const prompt=`Create one Nahtive lesson for an adult learning ${language} at CEFR ${L}. Learner explanation language: ${nativeLanguage}.
Curriculum sequence: ${node.sequence_number}. Situation: ${node.title}. Scenario: ${node.situation}. Focus: ${node.focus||"everyday communication"}.

CEFR RULES:
${rules}

TEACHING DESIGN:
- Create exactly ${phraseCount} core phrases/sentence frames. They should form a coherent progression inside one situation.
- Teach true A1 learners with common everyday phrases and short, predictable sentences. Keep the lesson practical and supported by the teaching cards.
- Phrase 1 introduces language appropriate to ${L}. Later phrases reuse earlier language while increasing communicative demand. Do not make Phrase 1 a generic greeting or self-introduction unless ${L} is A1 or the situation genuinely requires an advanced reuse.
- Every phrase must be genuinely natural for native speakers.
- Every phrase must include a meaning, when to use it, a breakdown, a natural example, pronunciation help, and a sentence-building target. Write explanations and translations in ${nativeLanguage}, not English unless the native language is English.
- For build_words, return the exact sequence of selectable chunks needed to construct build_target. Use words/chunks that make sense for the target language; for languages normally written without spaces, use meaningful chunks rather than individual characters.
- Give 4-6 plausible target-language distractors per phrase that require understanding. For A1 and above, use plausible target-language alternatives that require understanding. NEVER use English distractors unless the target language itself is English.
- All target-language learner content — target, example, dialogue, build_target, build_words, and distractors — must stay in the requested target language. The native language (${nativeLanguage}) is allowed only in meaning/usage/example_meaning/build_meaning and breakdown explanations.
- Before returning the JSON, verify that the lesson is internally consistent with the requested language and CEFR level.
- The learner should see more words than are required, and the correct words must be scrambled by the app.
- The lesson must be challenging without assuming knowledge above ${L}.
- Dialogue must contain exactly 4 lines: native, learner, native, learner, and must reuse the taught language.
- Create a dedicated final_challenge for the learner's last exercise. It must test the lesson's situation, not simply ask them to remember the last phrase.
- final_challenge.situation must describe one concrete real-world moment the learner can immediately picture.
- final_challenge.prompt must tell the learner exactly what they need to do, including who they are responding to and what information/action their response should communicate. Do not use vague prompts like "What would you say here?" without context.
- final_challenge.choices must contain exactly 4 target-language responses. Exactly ONE choice must be clearly appropriate for the stated situation and prompt. The other three must be plausible but clearly wrong, irrelevant, or inappropriate for that specific situation. Do not create two choices that could both reasonably satisfy the prompt.
- final_challenge.correct_answer must be an exact match for the one correct choice.
- The final challenge must be answerable using language taught in this lesson. Do not require vocabulary or grammar that was not taught or clearly introduced.
- final_challenge.situation and final_challenge.prompt should be written in the learner's native language; the four choices and correct_answer must be in the target language.
- Before returning JSON, simulate the challenge as a learner: verify the situation, prompt, and four choices together make one unambiguous question with exactly one defensible answer.
- Spanish must be contemporary Latin American / broadly American Spanish, never Spain-specific Spanish.
- Explanations and translations must be in ${nativeLanguage}. Target phrases and dialogue must remain in ${language}.

Return JSON only.`;

  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),30000);let response;
  try{
   response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},
    body:JSON.stringify({model:MODEL,input:prompt,max_output_tokens:5000,text:{format:{type:"json_schema",name:"nahtive_lesson",strict:true,schema:{
      type:"object",additionalProperties:false,
      properties:{
       title:{type:"string"},topic:{type:"string"},
       scene:{type:"object",additionalProperties:false,properties:{time:{type:"string"},place:{type:"string"},mission:{type:"string"},situation:{type:"string"}},required:["time","place","mission","situation"]},
       phrases:{type:"array",minItems:phraseCount,maxItems:phraseCount,items:{type:"object",additionalProperties:false,properties:{
        target:{type:"string"},meaning:{type:"string"},usage:{type:"string"},
        breakdown:{type:"array",minItems:1,maxItems:6,items:{type:"object",additionalProperties:false,properties:{target:{type:"string"},meaning:{type:"string"}},required:["target","meaning"]}},
        example:{type:"string"},example_meaning:{type:"string"},pronunciation:{type:"string"},
        build_target:{type:"string"},build_meaning:{type:"string"},
        build_words:{type:"array",minItems:1,maxItems:12,items:{type:"string"}},
        distractors:{type:"array",minItems:4,maxItems:6,items:{type:"string"}}
       },required:["target","meaning","usage","breakdown","example","example_meaning","pronunciation","build_target","build_meaning","build_words","distractors"]}},
       dialogue:{type:"array",minItems:4,maxItems:4,items:{type:"object",additionalProperties:false,properties:{speaker:{type:"string",enum:["native","learner"]},text:{type:"string"}},required:["speaker","text"]}},
       final_challenge:{type:"object",additionalProperties:false,properties:{
         situation:{type:"string"},
         prompt:{type:"string"},
         choices:{type:"array",minItems:4,maxItems:4,items:{type:"string"}},
         correct_answer:{type:"string"}
       },required:["situation","prompt","choices","correct_answer"]}
      },required:["title","topic","scene","phrases","dialogue","final_challenge"]
    }}}}),signal:controller.signal});
  }finally{clearTimeout(timeout)}
  if(!response.ok){console.error("OpenAI lesson generation failed:",await response.text());return jsonResponse(res,200,{title:String(node.title),topic:String(node.focus||"real conversation"),content:fallbackLesson(language,code,level,node),fallback:true})}
  const data=await response.json();const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;if(!text)throw new Error("OpenAI returned no lesson text");
  const parsed=JSON.parse(text);
  if(!Array.isArray(parsed.phrases)||parsed.phrases.length!==phraseCount)throw new Error("Invalid phrase count");
  if(parsed.phrases.some(p=>!p.target||!p.meaning||!p.usage||!p.example||!p.build_target||!p.build_meaning||!Array.isArray(p.build_words)||!p.build_words.length||!Array.isArray(p.distractors)||p.distractors.length<4))throw new Error("Incomplete phrase teaching data");
  // Enforce the CEFR floor after generation. Prompting alone is not enough.
  if(L==="B1"||L==="B2"||L==="C1"||L==="C2"){
    const key=String(code||"").toLowerCase().split("-")[0];
    const blocked=(beginnerPatterns[key]||[]);
    const beginnerCount=parsed.phrases.filter(p=>blocked.some(re=>re.test(String(p.target||"").trim()))).length;
    if(beginnerCount>0)throw new Error("Generated lesson contains beginner-level core content for "+L);
    const targets=parsed.phrases.map(p=>String(p.target||"").trim());
    const meaningful=targets.filter(t=>{
      const words=t.split(/\s+/).filter(Boolean);
      const punctuation=(t.match(/[,;:]/g)||[]).length;
      const compact=/^[^\s]+$/.test(t);
      const length=Array.from(t).length;
      return (compact ? length>=8 : words.length>=4)||punctuation>0||/[?？]$/.test(t);
    }).length;
    if(meaningful<3)throw new Error("Generated lesson does not meet the "+L+" communication floor");
  }
  // A build exercise is only valid when its selectable chunks reconstruct the
  // target sentence exactly. If the model returns mismatched chunks, repair
  // them from build_target rather than shipping an impossible exercise.
  parsed.phrases.forEach(p=>{
    const clean=v=>String(v||"").normalize("NFKC").replace(/\s+/g," ").trim();
    const joined=clean(p.build_words.join(" "));
    const target=clean(p.build_target);
    if(joined!==target){
      p.build_words=target.split(/\s+/).filter(Boolean);
    }
    const correctSet=new Set(p.build_words.map(clean));
    p.distractors=p.distractors.map(String).map(clean).filter(Boolean).filter(w=>!correctSet.has(w)).slice(0,6);
    while(p.distractors.length<4){
      const filler=target.split(/\s+/).find(w=>w&&!correctSet.has(w)&&!p.distractors.includes(w));
      if(!filler)break;
      p.distractors.push(filler);
    }
  });
  if(!Array.isArray(parsed.dialogue)||parsed.dialogue.length!==4)throw new Error("Invalid dialogue count");
  const expected=["native","learner","native","learner"];if(parsed.dialogue.some((line,i)=>line.speaker!==expected[i]))throw new Error("Invalid dialogue order");
  const fc=parsed.final_challenge;
  if(!fc||!String(fc.situation||"").trim()||!String(fc.prompt||"").trim()||!Array.isArray(fc.choices)||fc.choices.length!==4||!String(fc.correct_answer||"").trim())throw new Error("Invalid final challenge");
  const challengeChoices=fc.choices.map(v=>String(v||"").normalize("NFKC").replace(/\s+/g," ").trim());
  const correctAnswer=String(fc.correct_answer||"").normalize("NFKC").replace(/\s+/g," ").trim();
  if(challengeChoices.some((v,i)=>!v||challengeChoices.indexOf(v)!==i))throw new Error("Final challenge choices must be unique");
  if(!challengeChoices.includes(correctAnswer))throw new Error("Final challenge correct answer is not one of the choices");
  parsed.final_challenge={situation:String(fc.situation).trim(),prompt:String(fc.prompt).trim(),choices:challengeChoices,correct_answer:correctAnswer};
  parsed.language_code=String(code||"").toLowerCase();parsed.language_name=String(language||"");parsed.level=L;
  return jsonResponse(res,200,{title:parsed.title,topic:parsed.topic,content:parsed});
 }catch(e){
  console.error("Lesson generation exception:",e);
  return jsonResponse(res,200,{title:String(node?.title||"Your first conversation"),topic:String(node?.focus||"real conversation"),content:fallbackLesson(language,code,level,node),fallback:true,error:String(e?.message||"Generation failed")});
 }
}
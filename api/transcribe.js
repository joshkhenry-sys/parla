const MODEL="gpt-4o-transcribe";
const LANGUAGE_NAMES={en:"English",es:"Spanish",fr:"French",de:"German",nl:"Dutch",pl:"Polish",ar:"Arabic",it:"Italian",pt:"Portuguese",ja:"Japanese",ko:"Korean",zh:"Chinese"};

export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:"Missing OPENAI_API_KEY"});
 try{
  const {audio,mimeType="audio/webm",language="en-US",target=""}=req.body||{};
  if(!audio) return res.status(400).json({error:"Missing audio"});
  const bytes=Buffer.from(audio,"base64");
  if(!bytes.length) return res.status(400).json({error:"Empty audio"});
  if(bytes.length>8*1024*1024) return res.status(413).json({error:"Recording is too large"});
  const code=String(language).split("-")[0].toLowerCase();
  const languageName=LANGUAGE_NAMES[code]||code;
  const expected=String(target||"").trim().slice(0,500);
  const ext=mimeType.includes("mp4")?"mp4":mimeType.includes("ogg")?"ogg":mimeType.includes("wav")?"wav":"webm";
  const form=new FormData();
  form.append("file",new Blob([bytes],{type:mimeType}),"nahtive."+ext);
  form.append("model",MODEL);
  form.append("language",code);
  if(expected){
    form.append("prompt",`Transcribe the learner's speech in ${languageName}. Do not translate it. The learner is attempting to say this target expression: "${expected}". Preserve the words the learner actually says and do not replace them with an English translation.`);
  }else{
    form.append("prompt",`Transcribe the learner's speech in ${languageName}. Do not translate the speech into another language.`);
  }
  form.append("temperature","0");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:"Bearer "+process.env.OPENAI_API_KEY},body:form,signal:controller.signal});
  clearTimeout(timer);
  if(!r.ok){const detail=await r.text();return res.status(502).json({error:"Speech transcription failed",detail:detail.slice(0,400)})}
  const data=await r.json();
  return res.status(200).json({text:String(data.text||"").trim(),language:code,model:MODEL});
 }catch(e){return res.status(500).json({error:e.name==="AbortError"?"Speech transcription timed out":e.message||"Speech transcription failed"})}
}
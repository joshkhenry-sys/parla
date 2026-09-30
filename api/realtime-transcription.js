export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)return res.status(500).json({error:"OPENAI_API_KEY is not configured."});

  try{
    const body=req.body&&typeof req.body==="object"?req.body:{};
    const language=String(body.language||"en").toLowerCase().split("-")[0].trim();
    const target=String(body.target||"").trim().slice(0,500);
    const supported=["ar","en","es","fr","nl","pl","de","it","pt","ja","ko","zh","ru","tr","hi","id","vi","uk"];
    const lang=supported.includes(language)?language:"en";

    const session={
      type:"transcription",
      audio:{
        input:{
          transcription:{
            model:"gpt-live-transcribe",
            languages:[lang],
            delay:"minimal",
            ...(target?{prompt:"Language-learning speaking check. The learner is trying to say: "+target}: {})
          },
          turn_detection:null
        }
      }
    };

    const response=await fetch("https://api.openai.com/v1/realtime/client_secrets",{
      method:"POST",
      headers:{
        Authorization:"Bearer "+apiKey,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        session,
        expires_after:{anchor:"created_at",seconds:120}
      })
    });

    const data=await response.json().catch(()=>({}));
    if(!response.ok)return res.status(response.status).json({error:data?.error?.message||"Realtime session creation failed."});
    return res.status(200).json({value:data.value,expires_at:data.expires_at,session:data.session});
  }catch(error){
    console.error("Nahtive realtime transcription error:",error);
    return res.status(500).json({error:error?.message||"Realtime transcription unavailable."});
  }
}

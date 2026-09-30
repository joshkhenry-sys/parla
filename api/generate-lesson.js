const MODEL="gpt-5.6-luna";

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:"Missing OPENAI_API_KEY"});

  try{
    const {language,code,level,node}=req.body||{};
    if(!language||!code||!level||!node?.sequence_number||!node?.title||!node?.situation){
      return res.status(400).json({error:"Missing lesson generation inputs"});
    }

    const prompt=`Create one premium Nahtive language-learning lesson.

Target language: ${language} (${code})
Learner level: ${level}
Core curriculum position: ${node.sequence_number}/100
Stage: ${node.stage_name}
Situation: ${node.title}
Scenario: ${node.situation}
Learning focus: ${node.focus}

Nahtive teaches through one continuous real-world interaction, not a worksheet.
The learner should enter a believable situation, hear useful language, understand it, recognize it, say it, adapt it, and then handle the situation in conversation.

Rules:
- Write all target-language learner/native dialogue and phrases in the TARGET LANGUAGE.
- Meanings, explanations, and metadata are in English.
- Use everyday adult language appropriate to the learner's level.
- Do not use Spain-specific Spanish. For Spanish, use natural contemporary Latin American / broadly American Spanish.
- Do not make the lesson childish, gamified, or academic.
- Do not start with generic greetings unless the situation genuinely requires them.
- Higher levels must become more nuanced and spontaneous, not merely longer.
- Include natural contractions, discourse markers, register, indirectness, or reformulation when appropriate for the level.
- Keep the lesson focused on one situation.
- Give the learner language they could actually use outside the app.
- Do not translate every line literally.
- Dialogue should feel like a real exchange where the other person reacts to the learner.
- Exactly 3 teachable phrases.
- Exactly 6 dialogue lines, alternating native / learner / native / learner / native / learner.
- The first phrase should be immediately useful.
- The second should help the learner adapt or respond.
- The third should be useful in the final conversation.
`;

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),45000);
    const r=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+process.env.OPENAI_API_KEY
      },
      body:JSON.stringify({
        model:MODEL,
        input:prompt,
        reasoning:{effort:"low"},
        max_output_tokens:2600,
        text:{format:{
          type:"json_schema",
          name:"nahtive_lesson",
          strict:true,
          schema:{
            type:"object",
            additionalProperties:false,
            properties:{
              title:{type:"string"},
              topic:{type:"string"},
              xp:{type:"integer",minimum:30,maximum:80},
              scene:{
                type:"object",additionalProperties:false,
                properties:{
                  time:{type:"string"},
                  place:{type:"string"},
                  mission:{type:"string"},
                  situation:{type:"string"}
                },
                required:["time","place","mission","situation"]
              },
              phrases:{
                type:"array",minItems:3,maxItems:3,
                items:{
                  type:"object",additionalProperties:false,
                  properties:{
                    target:{type:"string"},
                    meaning:{type:"string"},
                    usage:{type:"string"}
                  },
                  required:["target","meaning","usage"]
                }
              },
              dialogue:{
                type:"array",minItems:6,maxItems:6,
                items:{
                  type:"object",additionalProperties:false,
                  properties:{
                    speaker:{type:"string",enum:["native","learner"]},
                    text:{type:"string"}
                  },
                  required:["speaker","text"]
                }
              },
              language:{
                type:"object",additionalProperties:false,
                properties:{
                  code:{type:"string"},
                  phrase:{type:"string"},
                  meaning:{type:"string"},
                  usage:{type:"string"},
                  pronunciation:{type:"string"}
                },
                required:["code","phrase","meaning","usage","pronunciation"]
              }
            },
            required:["title","topic","xp","scene","phrases","dialogue","language"]
          }
        }}
      }),
      signal:controller.signal
    });
    clearTimeout(timer);

    if(!r.ok){
      const body=await r.text();
      return res.status(502).json({error:"Lesson generation failed",detail:body.slice(0,500)});
    }

    const data=await r.json();
    const text=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
    if(!text) return res.status(502).json({error:"No lesson returned"});

    const parsed=JSON.parse(text);
    if(!Array.isArray(parsed.phrases)||parsed.phrases.length!==3) return res.status(502).json({error:"Lesson phrase structure was invalid"});
    if(!Array.isArray(parsed.dialogue)||parsed.dialogue.length!==6) return res.status(502).json({error:"Lesson dialogue structure was invalid"});

    const expected=["native","learner","native","learner","native","learner"];
    if(parsed.dialogue.some((line,i)=>line.speaker!==expected[i])){
      return res.status(502).json({error:"Lesson dialogue order was invalid"});
    }

    parsed.language.code=code;
    parsed.xp=Math.max(30,Math.min(80,Number(parsed.xp)||50));
    return res.status(200).json({title:parsed.title,topic:parsed.topic,content:parsed});
  }catch(e){
    return res.status(500).json({error:e.name==="AbortError"?"Lesson generation timed out":e.message});
  }
}

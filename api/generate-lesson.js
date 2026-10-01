const MODEL="gpt-5.6-luna";

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"Missing OPENAI_API_KEY"});

  try{
    const {language,code,level,node,memory=[]}=req.body||{};
    if(!language||!code||!level||!node?.sequence_number||!node?.title||!node?.situation){
      return res.status(400).json({error:"Missing lesson generation inputs"});
    }

    const memoryItems=Array.isArray(memory)?memory.slice(0,6):[];

    const prompt=`Create one premium Nahtive language-learning lesson.

Target language: ${language} (${code})
Learner level: ${level}
Curriculum position: ${node.sequence_number}/100
Stage: ${node.stage_name}
Situation: ${node.title}
Scenario: ${node.situation}
Learning focus: ${node.focus}

Nahtive is practical conversation training for adults. Build ONE believable real-world interaction.
The learner should learn a small set of useful expressions, understand exactly when to use them, recognize them, say them, and then use them in a short live exchange.

Adaptive memory:
${JSON.stringify(memoryItems)}

If memory contains weak expressions, naturally recycle at most one of them. Never announce that you are reviewing it.

Rules:
- All target-language phrases and dialogue must be in the TARGET LANGUAGE.
- Meanings, usage notes, and metadata must be in English.
- For Spanish, use contemporary Latin American / broadly American Spanish, never Spain-specific wording.
- Use natural adult language people actually say.
- Avoid textbook dialogue, childish language, generic filler, and gamification.
- Keep one clear situation.
- Exactly 3 teachable phrases.
- Every phrase needs: target, meaning, usage, and a short natural example in the target language.
- Phrase 1 should solve the immediate problem.
- Phrase 2 should help the learner respond or adapt.
- Phrase 3 should help them finish or handle a variation.
- Exactly 6 dialogue lines, alternating native / learner / native / learner / native / learner.
- The dialogue must sound like a real exchange, not a lesson script.
- Keep phrases concise enough to remember.
`;

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),22000);

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
        max_output_tokens:1800,
        text:{
          format:{
            type:"json_schema",
            name:"nahtive_lesson",
            strict:true,
            schema:{
              type:"object",
              additionalProperties:false,
              properties:{
                title:{type:"string"},
                topic:{type:"string"},
                scene:{
                  type:"object",
                  additionalProperties:false,
                  properties:{
                    time:{type:"string"},
                    place:{type:"string"},
                    mission:{type:"string"},
                    situation:{type:"string"}
                  },
                  required:["time","place","mission","situation"]
                },
                phrases:{
                  type:"array",
                  minItems:3,
                  maxItems:3,
                  items:{
                    type:"object",
                    additionalProperties:false,
                    properties:{
                      target:{type:"string"},
                      meaning:{type:"string"},
                      usage:{type:"string"},
                      example:{type:"string"}
                    },
                    required:["target","meaning","usage","example"]
                  }
                },
                dialogue:{
                  type:"array",
                  minItems:6,
                  maxItems:6,
                  items:{
                    type:"object",
                    additionalProperties:false,
                    properties:{
                      speaker:{type:"string",enum:["native","learner"]},
                      text:{type:"string"}
                    },
                    required:["speaker","text"]
                  }
                }
              },
              required:["title","topic","scene","phrases","dialogue"]
            }
          }
        }
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
    if(!text)return res.status(502).json({error:"No lesson returned"});

    const parsed=JSON.parse(text);

    if(!Array.isArray(parsed.phrases)||parsed.phrases.length!==3){
      return res.status(502).json({error:"Lesson phrase structure was invalid"});
    }

    if(parsed.phrases.some(p=>!p.target||!p.meaning||!p.usage||!p.example)){
      return res.status(502).json({error:"Lesson phrase details were incomplete"});
    }

    if(!Array.isArray(parsed.dialogue)||parsed.dialogue.length!==6){
      return res.status(502).json({error:"Lesson dialogue structure was invalid"});
    }

    const expected=["native","learner","native","learner","native","learner"];
    if(parsed.dialogue.some((line,i)=>line.speaker!==expected[i])){
      return res.status(502).json({error:"Lesson dialogue order was invalid"});
    }

    return res.status(200).json({
      title:parsed.title,
      topic:parsed.topic,
      content:parsed
    });
  }catch(e){
    return res.status(500).json({
      error:e.name==="AbortError"?"Lesson generation timed out":"Lesson generation failed",
      detail:e.name==="AbortError"?"The lesson model took too long.":""
    });
  }
}

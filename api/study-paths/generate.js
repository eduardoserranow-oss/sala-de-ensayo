const GATEWAY_URL="https://ai-gateway.vercel.sh/v1/chat/completions";
const MODEL="openai/gpt-5.6-sol";
const INSTRUMENTS=["Guitarra eléctrica","Bajo eléctrico","Guitarra acústica","Voz","Piano / Keys","Otro"];
const LEVELS=["Sin repertorio","Repertorio en desarrollo","Repertorio establecido"];
const JOURNEYS=["Aprender fundamentos primero","Ruta más rápida al estilo final","Llenar vacíos musicales","Construir repertorio profesional"];

function sendJson(response,status,body){response.statusCode=status;response.setHeader("Content-Type","application/json; charset=utf-8");response.setHeader("Cache-Control","no-store");response.end(JSON.stringify(body))}
function text(value,max){return typeof value==="string"?value.trim().slice(0,max):""}
function clean(value,max=320){return text(value,max).replace(/[<>]/g,"")}
function parseBody(request){if(typeof request.body==="string")return JSON.parse(request.body||"{}");return request.body||{}}
function fail(message,status=400){const error=new Error(message);error.status=status;throw error}

function schema(stageCount){
  const song={type:"object",additionalProperties:false,properties:{artist:{type:"string"},title:{type:"string"},study:{type:"string"}},required:["artist","title","study"]};
  return {type:"object",additionalProperties:false,properties:{name:{type:"string"},objective:{type:"string"},stages:{type:"array",minItems:stageCount,maxItems:stageCount,items:{type:"object",additionalProperties:false,properties:{title:{type:"string"},objective:{type:"string"},a:song,b:song,connection:{type:"string"}},required:["title","objective","a","b","connection"]}}},required:["name","objective","stages"]};
}

function normalizeProject(value,stageCount){
  if(!value||typeof value!=="object"||!Array.isArray(value.stages)||value.stages.length!==stageCount)fail("La IA devolvió una ruta incompleta. Inténtalo de nuevo.",502);
  const stages=value.stages.map((stage,index)=>{
    const result={id:`ai-stage-${Date.now()}-${index+1}`,title:clean(stage?.title,90),objective:clean(stage?.objective,280),a:{artist:clean(stage?.a?.artist,90),title:clean(stage?.a?.title,100),study:clean(stage?.a?.study,300)},b:{artist:clean(stage?.b?.artist,90),title:clean(stage?.b?.title,100),study:clean(stage?.b?.study,300)},connection:clean(stage?.connection,360)};
    if(!result.title||!result.objective||!result.a.artist||!result.a.title||!result.a.study||!result.b.artist||!result.b.title||!result.b.study||!result.connection)fail("La IA devolvió una etapa incompleta. Inténtalo de nuevo.",502);
    return result;
  });
  const project={name:clean(value.name,70),objective:clean(value.objective,280),stages};
  if(!project.name||!project.objective)fail("La IA no pudo nombrar la ruta. Inténtalo de nuevo.",502);
  return project;
}

export default async function handler(request,response){
  if(request.method!=="POST"){response.setHeader("Allow","POST");return sendJson(response,405,{ok:false,error:"Método no permitido."})}
  try{
    const body=parseBody(request);
    const instrument=text(body.instrument,60),level=text(body.level,60),destination=clean(body.destination,120),journey=text(body.journey,80),stageCount=Number(body.stageCount);
    if(!INSTRUMENTS.includes(instrument))fail("Selecciona un instrumento válido.");
    if(!LEVELS.includes(level))fail("Selecciona tu nivel de repertorio.");
    if(!destination||destination.length<3)fail("Escribe el estilo o destino al que quieres llegar.");
    if(!JOURNEYS.includes(journey))fail("Selecciona el tipo de recorrido.");
    if(![6,8,12].includes(stageCount))fail("Selecciona 6, 8 o 12 etapas.");
    const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
    if(!token)fail("La conexión de IA todavía no está disponible.",503);
    const system=`Eres el diseñador pedagógico de Study Paths de FORTISSIMO. Creas currículos de repertorio musical, no rutinas técnicas ni reproductores. Responde en español. Cada etapa contiene una dupla: Canción A enseña el lenguaje, su raíz histórica o fundamento; Canción B aplica, evoluciona o reconoce ese lenguaje en una obra más moderna o cercana al destino. Usa únicamente canciones reales y verificables con partes relevantes para el instrumento indicado. No inventes títulos, artistas ni colaboraciones. Diseña una progresión coherente hacia el destino, explica qué se estudia en cada canción y la conexión A → B. El nivel describe repertorio, no destreza técnica. Evita repetir canciones. No incluyas tabs, stems, enlaces, metrónomo ni práctica dentro de FORTISSIMO.`;
    const user=`Instrumento: ${instrument}\nNivel de repertorio: ${level}\nDestino musical: ${destination}\nTipo de recorrido: ${journey}\nCantidad exacta de etapas: ${stageCount}\n\nGenera nombre, objetivo general y exactamente ${stageCount} etapas. Mantén cada explicación clara y breve.`;
    const gateway=await fetch(GATEWAY_URL,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,stream:false,messages:[{role:"system",content:system},{role:"user",content:user}],response_format:{type:"json_schema",json_schema:{name:"fortissimo_study_path",description:"Ruta musical progresiva con parejas de canciones",strict:true,schema:schema(stageCount)}}}),signal:AbortSignal.timeout(55000)});
    const payload=await gateway.json().catch(()=>null);
    if(!gateway.ok){console.error("[study-path-ai] gateway",gateway.status,payload?.error?.message||"unknown");if(gateway.status===429)fail("La IA está ocupada ahora mismo. Espera un momento e inténtalo otra vez.",429);fail("No pudimos generar la ruta ahora mismo. Inténtalo otra vez.",502)}
    const content=payload?.choices?.[0]?.message?.content;
    if(!content)fail("La IA no devolvió una ruta. Inténtalo otra vez.",502);
    const project=normalizeProject(JSON.parse(content),stageCount);
    return sendJson(response,200,{ok:true,project});
  }catch(error){
    if(error?.name==="TimeoutError")return sendJson(response,504,{ok:false,error:"La ruta tardó demasiado. Inténtalo otra vez."});
    if(error instanceof SyntaxError)return sendJson(response,502,{ok:false,error:"La IA devolvió una respuesta que no pudimos leer. Inténtalo otra vez."});
    console.error("[study-path-ai] generation failed",error?.message||error);
    return sendJson(response,error?.status||500,{ok:false,error:error?.status?error.message:"No pudimos generar la ruta ahora mismo."});
  }
}

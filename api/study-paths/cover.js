const GATEWAY_URL="https://ai-gateway.vercel.sh/v1/images/generations";
const MODEL="openai/gpt-image-1";

function sendJson(res,status,body){res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(body))}
function parseBody(req){if(typeof req.body==="string")return JSON.parse(req.body||"{}");return req.body||{}}
function clean(v,max=500){return typeof v==="string"?v.trim().slice(0,max).replace(/[<>]/g,""):""}
function fail(message,status=400){const e=new Error(message);e.status=status;throw e}

function buildPrompt(body){
  const name=clean(body.name,100)||"Study Path";
  const instrument=clean(body.instrument,80)||"instrumento musical";
  const objective=clean(body.objective,420);
  const stages=Array.isArray(body.stages)?body.stages.slice(0,12):[];
  const stageText=stages.map((s,i)=>{
    const a=s?.a||{},b=s?.b||{};
    return `${i+1}. ${clean(s?.title,90)} — ${clean(a.artist,70)} / ${clean(a.title,90)} → ${clean(b.artist,70)} / ${clean(b.title,90)}`;
  }).join("\n");
  return `Create a premium square editorial cover for a music-learning curriculum called "${name}". Instrument focus: ${instrument}. Objective: ${objective}. Musical journey:\n${stageText}\n\nVisual direction: cinematic music editorial artwork, sophisticated recording-studio atmosphere, tactile instruments, cables, amps, vinyl-era texture mixed with modern production aesthetics, strong depth, dramatic but elegant lighting, premium dark palette with warm orange accents compatible with FORTISSIMO branding. Represent the musical eras and styles symbolically through instruments, rooms, textures and performance energy. Do NOT depict recognizable celebrities, artist likenesses, copyrighted album artwork, logos, brand names or readable text. No typography. No UI. Square composition, strong focal point, suitable as a small app cover thumbnail and a larger curriculum hero image.`;
}

export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return sendJson(res,405,{ok:false,error:"Método no permitido."})}
  try{
    const body=parseBody(req);
    const prompt=buildPrompt(body);
    if(prompt.length<80)fail("No hay suficiente información para generar la portada.");
    const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN;
    if(!token)fail("La conexión de IA todavía no está disponible.",503);
    const gateway=await fetch(GATEWAY_URL,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,prompt,size:"1024x1024",n:1,response_format:"b64_json"}),signal:AbortSignal.timeout(85000)});
    const payload=await gateway.json().catch(()=>null);
    if(!gateway.ok){
      console.error("[study-path-cover] gateway",gateway.status,payload?.error?.message||"unknown");
      if(gateway.status===429)fail("La IA está ocupada ahora mismo. Inténtalo en un momento.",429);
      fail("No pudimos generar la portada ahora mismo.",502);
    }
    const item=payload?.data?.[0]||payload?.images?.[0]||null;
    const base64=item?.b64_json||item?.base64||item?.image_base64||"";
    const url=item?.url||"";
    if(!base64&&!url)fail("La IA no devolvió una imagen utilizable.",502);
    return sendJson(res,200,{ok:true,image:base64?{type:"base64",data:base64,mime:"image/png"}:{type:"url",data:url,mime:"image/png"}});
  }catch(error){
    if(error?.name==="TimeoutError")return sendJson(res,504,{ok:false,error:"La portada tardó demasiado. Inténtalo otra vez."});
    if(error instanceof SyntaxError)return sendJson(res,400,{ok:false,error:"Solicitud inválida."});
    console.error("[study-path-cover] failed",error?.message||error);
    return sendJson(res,error?.status||500,{ok:false,error:error?.status?error.message:"No pudimos generar la portada ahora mismo."});
  }
}

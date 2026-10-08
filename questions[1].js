// Shared editable Question Bank for Forces Quest.
const KEY = 'dr-raghda:unit5:question-bank';
const MAX = 500;
function cleanQ(q){
  if(!q || typeof q!=='object') return null;
  const x={...q};
  x.id=String(x.id||'').slice(0,80); x.L=['L12','L13','L14','L15','L16'].includes(x.L)?x.L:'L12';
  x.kind=['tf','mcq','term','comp','fix','prob','num'].includes(x.kind)?x.kind:'mcq';
  x.t=String(x.t||'').slice(0,2000); x.ex=String(x.ex||'').slice(0,3000);
  if(!x.id||!x.t)return null;
  if(x.kind==='tf') x.a=!!x.a;
  else if(x.kind==='num'){x.a=Number(x.a);x.u=String(x.u||'').slice(0,40);x.tol=Number.isFinite(Number(x.tol))?Number(x.tol):0.02;x.abs=!!x.abs;if(!Number.isFinite(x.a))return null;}
  else {x.o=Array.isArray(x.o)?x.o.slice(0,4).map(v=>String(v||'').slice(0,500)):[];while(x.o.length<4)x.o.push('');x.a=Math.max(0,Math.min(3,Math.round(Number(x.a)||0)));}
  return x;
}
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
  const PASS=process.env.TEACHER_PASSWORD||'';
  const redis=async(cmd)=>{const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(cmd)});const j=await r.json();if(j.error)throw Error(j.error);return j.result;};
  try{
    if(req.method==='GET'){
      if(!url||!token) return res.status(200).json({storage:false});
      const raw=await redis(['GET',KEY]);
      if(raw){try{return res.status(200).json(JSON.parse(raw));}catch{}}
      return res.status(200).json({storage:true,questions:null,cards:[]});
    }
    if(req.method==='PUT'){
      if(!PASS||req.headers['x-teacher-pass']!==PASS)return res.status(401).json({error:'wrong_password'});
      if(!url||!token)return res.status(503).json({error:'storage_not_configured'});
      let b=req.body;if(typeof b==='string')b=JSON.parse(b||'{}');
      const questions=Array.isArray(b.questions)?b.questions.slice(0,MAX).map(cleanQ).filter(Boolean):[];
      const cards=Array.isArray(b.cards)?b.cards.slice(0,200).map((c,i)=>({id:String(c.id||`card-${i+1}`),L:['L12','L13','L14','L15','L16'].includes(c.L)?c.L:'L12',q:String(c.q||'').slice(0,2000),a:String(c.a||'').slice(0,3000)})).filter(c=>c.q):[];
      const payload={version:2,questions,cards,updatedAt:new Date().toISOString()};
      await redis(['SET',KEY,JSON.stringify(payload)]);
      return res.status(200).json({ok:true,storage:true,questions:questions.length});
    }
    return res.status(405).json({error:'method_not_allowed'});
  }catch(e){return res.status(500).json({error:'server_error',detail:String(e.message||e)});}
};

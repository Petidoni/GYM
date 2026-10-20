/* GYM TRACKER optional Supabase sync. Do not use service_role/secret keys in browsers. */
(()=>{
const CFG="gym-cloud-config-v1",ROW="gym_tracker_data",origin=localStorage.getItem(CFG);let config;try{config=JSON.parse(origin)}catch{}
let client=null,user=null,remoteReady=false,busy=false,dirty=false,pending=null;
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status=(t)=>{const el=document.getElementById("saveStatus");if(el)el.textContent=t};
function setup(){
 if(!config?.url||!config?.key||!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/.test(config.url))return;
 if(!window.supabase?.createClient){status("Nube no disponible");return}
 try{client=window.supabase.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});client.auth.onAuthStateChange((ev,session)=>{user=session?.user||null;remoteReady=false;status(user?"☁ Conectando":"● Guardado local");if(user)setTimeout(()=>sync(),20);drawPanel()});client.auth.getSession().then(({data})=>{user=data.session?.user||null;if(user)sync();drawPanel()})}catch(e){status("Error en configuración")}
}
function merged(local,remote){const out={exercises:[],sessions:[]};for(const key of ["exercises","sessions"]){const m=new Map();for(const item of remote?.[key]||[])if(item?.id)m.set(item.id,item);for(const item of local?.[key]||[])if(item?.id)m.set(item.id,item);out[key]=[...m.values()]}return out}
async function sync(){
 if(!client||!user||busy){dirty=true;return}
 busy=true;status("☁ Sincronizando");
 try{
  const {data,error}=await client.from(ROW).select("payload").eq("user_id",user.id).maybeSingle();if(error)throw error;
  const copy=merged(db,data?.payload||{});
  const {error:upError}=await client.from(ROW).upsert({user_id:user.id,payload:copy,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(upError)throw upError;
  db=copy;localStorage.setItem("gym-tracker-v1",JSON.stringify(db));remoteReady=true;dirty=false;status("☁ Sincronizado");render();drawPanel();
 }catch(err){remoteReady=false;dirty=true;status("⚠ Solo local");console.warn("Cloud sync failed",err);drawPanel()}
 finally{busy=false;if(dirty&&remoteReady){dirty=false;clearTimeout(pending);pending=setTimeout(sync,800)}}
}
window.gymCloudChanged=()=>{if(!user)return;dirty=true;clearTimeout(pending);pending=setTimeout(sync,900)};
window.gymCloudConnect=()=>{
 const url=document.getElementById("cloudUrl")?.value.trim(),key=document.getElementById("cloudKey")?.value.trim();
 if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/.test(url))return alert("Introduce la URL https://...supabase.co");
 if(!key||!key.startsWith("sb_publishable_")&&!key.startsWith("eyJ"))return alert("Usa una clave pública publishable o anon. Nunca una clave secreta.");
 config={url,key};localStorage.setItem(CFG,JSON.stringify(config));location.reload()
};
window.gymCloudSignIn=async()=>{
 if(!client)return alert("Primero configura Supabase");
 const email=document.getElementById("cloudEmail")?.value.trim(),password=document.getElementById("cloudPassword")?.value;
 if(!email||!password)return alert("Introduce correo y contraseña");
 const {error}=await client.auth.signInWithPassword({email,password});if(error)alert(error.message);else{const {data}=await client.auth.getUser();user=data.user;await sync();drawPanel()}
};
window.gymCloudSignUp=async()=>{
 if(!client)return alert("Primero configura Supabase");
 const email=document.getElementById("cloudEmail")?.value.trim(),password=document.getElementById("cloudPassword")?.value;
 if(!email||!password||password.length<8)return alert("Introduce correo y contraseña de al menos 8 caracteres");
 const {data,error}=await client.auth.signUp({email,password});
 if(error)alert(error.message);else if(!data.session)alert("Revisa tu correo y confirma tu registro; después inicia sesión.");else{user=data.user;sync()}
};
window.gymCloudSignOut=async()=>{if(client){await client.auth.signOut();user=null;remoteReady=false;status("● Guardado local");drawPanel();}};
window.gymCloudForgetConfig=()=>{if(!confirm("¿Desconectar esta configuración de nube? Los datos locales no se borrarán."))return;localStorage.removeItem(CFG);location.reload()};
window.gymCloudSyncNow=()=>sync();
function drawPanel(){
 const e=document.getElementById("cloudPanel");if(!e)return;
 let body;
 if(!config?.url)body='<p class="muted">Para activar la nube conecta tu proyecto de Supabase. Tus datos actuales seguirán guardados en este navegador hasta que inicies sesión.</p><label>URL del proyecto Supabase</label><input id="cloudUrl" placeholder="https://xxxx.supabase.co"><label>Clave pública (publishable/anon)</label><input id="cloudKey" placeholder="sb_publishable_..."><p class="hint">No introduzcas service_role ni claves secretas.</p><button class="primary" onclick="gymCloudConnect()">Conectar proyecto</button>';
 else if(!user)body='<p class="muted">Proyecto configurado. Inicia sesión con tu cuenta de entrenamiento.</p><label>Correo electrónico</label><input id="cloudEmail" type="email" autocomplete="email"><label>Contraseña (mínimo 8 caracteres)</label><input id="cloudPassword" type="password" autocomplete="current-password"><div class="row" style="margin-top:12px"><button class="primary" onclick="gymCloudSignIn()">Iniciar sesión</button><button class="alt" onclick="gymCloudSignUp()">Crear cuenta</button></div><p class="hint">Al registrarte quizá tengas que confirmar tu correo.</p><button class="alt" style="margin-top:12px" onclick="gymCloudForgetConfig()">Cambiar proyecto</button>';
 else body='<p class="tag">● Cuenta: '+safe(user.email)+'</p><p class="muted">'+(remoteReady?"Datos sincronizados con Supabase.":"Aún no se ha podido confirmar la sincronización. Tus datos permanecen localmente.")+'</p><div class="row"><button class="primary" onclick="gymCloudSyncNow()">Sincronizar ahora</button><button class="alt" onclick="gymCloudSignOut()">Cerrar sesión</button></div>';
 e.innerHTML='<div class="card"><h3>☁ Sincronización en la nube</h3>'+body+'</div>';
}
const originalRender=window.render;
window.render=function(){originalRender();drawPanel()};
if(config?.url)setup();drawPanel();
})();

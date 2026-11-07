const sb=supabase.createClient(SUPABASE.url,SUPABASE.key);
const fix=r=>({...r,mod:r.module});
const Store={
 async list(){const {data,error}=await sb.from('resources').select('*').order('created_at',{ascending:false});if(error)throw error;return data.map(fix)},
 async add(d){const {data,error}=await sb.from('resources').insert({spec:d.spec,sem:d.sem,module:d.mod,type:d.type,title:d.title,url:d.url,year:d.year||null}).select().single();if(error)throw error;return fix(data)},
 async remove(id){const {error}=await sb.from('resources').delete().eq('id',id);if(error)throw error},
 favs(){try{return new Set(JSON.parse(localStorage.getItem('favs')||'[]'))}catch(e){return new Set()}},
 saveFavs(s){try{localStorage.setItem('favs',JSON.stringify([...s]))}catch(e){}}
};
let isAdmin=false;
async function checkAdmin(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){isAdmin=false;return}
 const {data}=await sb.from('admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
 isAdmin=!!data;
}
function drawAuth(){$('#login').hidden=isAdmin;$('#logout').hidden=!isAdmin;$('#addBtn').hidden=!isAdmin}
async function reload(){try{items=await Store.list()}catch(e){items=[];toast('تعذر تحميل المصادر، تحقق من الاتصال')}drawAuth();render()}
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLOR={'درس':'var(--lesson)','امتحان سابق':'var(--exam)','مرجع':'var(--ref)','ملخص':'var(--sum)'};
const noun=n=>n===0?'لا مصادر بعد':n===1?'مصدر واحد':n===2?'مصدران':n<=10?n+' مصادر':n+' مصدراً';
const norm=s=>String(s||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
let items=[],favs=Store.favs(),spec=SPECIALTIES[0],sem,mod=null,type='الكل',fav=false,q='';
const mine=()=>items.filter(i=>i.spec===spec.id);
function reset(){sem=Object.keys(spec.semesters)[0];mod=null;type='الكل';fav=false;q='';$('#q').value='';$('#favOnly').setAttribute('aria-pressed','false')}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200)}

function render(){
 const all=mine(),active=q||mod||fav;
 $('#stats').innerHTML=[[all.length,'مصدر'],[Object.values(spec.semesters).flat().length,'مادة'],[Object.keys(spec.semesters).length,'سداسيات']].map(([n,l])=>`<div><b>${n}</b><span>${l}</span></div>`).join('');
 $('#browse').hidden=!!active;$('#results').hidden=!active;
 active?drawResults(all):drawBrowse(all);
 try{history.replaceState(null,'',mod&&!q?'#'+encodeURIComponent(sem+'|'+mod):location.pathname+location.search)}catch(e){}
}
function drawBrowse(all){
 $('#sems').innerHTML=Object.keys(spec.semesters).map(s=>`<button class="tab" role="tab" aria-selected="${s===sem}" data-sem="${esc(s)}">${esc(s)}</button>`).join('');
 $('#modGrid').innerHTML=spec.semesters[sem].map(m=>{
  const l=all.filter(i=>i.sem===sem&&i.mod===m);
  const b=['درس','امتحان سابق','مرجع','ملخص'].map(t=>[t,l.filter(i=>i.type===t).length]).filter(x=>x[1]).map(([t,n])=>`<span class="bd" style="--c:${COLOR[t]}">${n} ${t}</span>`).join('');
  return `<button class="mcard" data-mod="${esc(m)}"><h3>${esc(m)}</h3><p>${noun(l.length)}</p><div class="badges">${b}</div></button>`}).join('');
}
function drawResults(all){
 let l=all;
 if(q){const s=norm(q);l=l.filter(i=>norm([i.title,i.mod,i.year,i.sem].join(' ')).includes(s))}
 else if(mod)l=l.filter(i=>i.sem===sem&&i.mod===mod);
 if(fav)l=l.filter(i=>favs.has(i.id));
 const base=l.length;
 if(type!=='الكل')l=l.filter(i=>i.type===type);
 $('#rtitle').textContent=q?`نتائج البحث عن «${q}»`:mod?`${sem} › ${mod}`:'المحفوظات';
 $('#types').innerHTML=TYPES.map(t=>`<button class="tab" aria-selected="${t===type}" data-type="${t}">${t}</button>`).join('');
 $('#count').textContent=l.length?noun(l.length):'';
 $('#list').innerHTML=l.length?l.map(i=>`<article class="item"><span class="tbadge" style="--c:${COLOR[i.type]}">${esc(i.type)}</span><div class="body"><h3>${esc(i.title)}</h3><div class="meta">${esc(i.mod)} – ${esc(i.sem)}${i.year?' – '+esc(i.year):''}</div></div><div class="act"><a href="${esc(i.url)}" target="_blank" rel="noopener">فتح</a>${isAdmin?`<button class="del" data-del="${i.id}">حذف</button>`:''}<button class="star" data-id="${i.id}" aria-pressed="${favs.has(i.id)}" aria-label="حفظ">★</button></div></article>`).join('')
 :`<div class="empty"><h3>${base?'لا توجد مصادر من هذا النوع':fav?'لم تحفظ أي مصدر بعد':'لا توجد مصادر هنا بعد'}</h3><p>${fav?'اضغط ★ على أي مصدر لحفظه هنا.':'سيُضاف المحتوى قريباً.'}</p>${fav?'':isAdmin?'<button class="btn" data-open>+ إضافة مصدر</button>':''}</div>`;
}
function fillForm(s,m){
 const f=$('#add');f.sem.innerHTML=Object.keys(spec.semesters).map(x=>`<option>${esc(x)}</option>`).join('');
 f.sem.value=s||sem;
 const fm=()=>{f.mod.innerHTML=spec.semesters[f.sem.value].map(x=>`<option>${esc(x)}</option>`).join('')};
 f.sem.onchange=fm;fm();if(m)f.mod.value=m;
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-sem],[data-mod],[data-type],[data-id],[data-open],[data-del]');if(!t)return;
 const d=t.dataset;
 if('sem'in d){sem=d.sem;render()}
 else if('mod'in d){mod=d.mod;type='الكل';render();scrollTo({top:0,behavior:'smooth'})}
 else if('type'in d){type=d.type;render()}
 else if('id'in d){favs.has(d.id)?favs.delete(d.id):favs.add(d.id);Store.saveFavs(favs);render()}
 else if('open'in d){if(!isAdmin)return;fillForm(sem,mod);$('#dlg').showModal()}
 else if('del'in d){if(!isAdmin||!confirm('حذف هذا المصدر نهائياً؟'))return;
  Store.remove(d.del).then(()=>{items=items.filter(i=>i.id!==d.del);render();toast('تم الحذف')}).catch(()=>toast('تعذر الحذف'))}
});
$('#back').onclick=()=>{reset();render()};
$('#home').onclick=e=>{e.preventDefault();reset();render()};
$('#favOnly').onclick=e=>{fav=!fav;e.currentTarget.setAttribute('aria-pressed',fav);render()};
$('#q').addEventListener('input',e=>{q=e.target.value.trim();type='الكل';render()});
$('#spec').onchange=e=>{spec=SPECIALTIES.find(s=>s.id===e.target.value);reset();render()};
$('#cancel').onclick=()=>$('#dlg').close();
$('#add').onsubmit=async e=>{e.preventDefault();
 const d=Object.fromEntries(new FormData(e.target));d.spec=spec.id;
 try{const r=await Store.add(d);items.unshift(r);$('#dlg').close();e.target.reset();
  reset();sem=d.sem;mod=d.mod;render();toast('تم نشر المصدر')}
 catch(err){toast('تعذر النشر: '+(err.message||'خطأ غير معروف'))}
};
$('#login').onclick=()=>{$('#authmsg').textContent='';$('#ldlg').showModal()};
$('#lcancel').onclick=()=>$('#ldlg').close();
$('#lform').onsubmit=async e=>{e.preventDefault();const f=e.target;
 const {error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
 if(error){$('#authmsg').textContent='بيانات الدخول غير صحيحة.';return}
 await checkAdmin();
 if(!isAdmin){await sb.auth.signOut();$('#authmsg').textContent='هذا الحساب ليس مشرفاً.';return}
 f.reset();$('#ldlg').close();await reload();toast('مرحباً بك');
};
$('#logout').onclick=async()=>{await sb.auth.signOut();isAdmin=false;await reload();toast('تم تسجيل الخروج')};
(function theme(){
 let t;try{t=localStorage.getItem('theme')}catch(e){}
 document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
 $('#theme').onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};
})();
(async()=>{
 $('#brand').textContent=SITE.brand;$('#school').textContent=SITE.school;$('#headline').textContent=SITE.headline;$('#sub').textContent=SITE.sub;$('#foot-school').textContent=SITE.school;
 $('#spec').innerHTML=SPECIALTIES.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 await checkAdmin();reset();
 try{const [s,m]=decodeURIComponent(location.hash.slice(1)).split('|');if(spec.semesters[s]&&spec.semesters[s].includes(m)){sem=s;mod=m}}catch(e){}
 await reload();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();

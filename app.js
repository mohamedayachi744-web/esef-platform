const sb=supabase.createClient(SUPABASE.url,SUPABASE.key);
const fix=r=>({...r,mod:r.module});
const Store={
 async list(){const {data,error}=await sb.from('resources').select('*').order('created_at',{ascending:false});if(error)throw error;return data.map(fix)},
 async add(d,status){const {data,error}=await sb.from('resources').insert({spec:d.spec,sem:d.sem,module:d.mod,type:d.type,title:d.title,url:d.url,year:d.year||null,status}).select().single();if(error)throw error;return fix(data)},
 async setStatus(id,status){const {data,error}=await sb.from('resources').update({status}).eq('id',id).select();if(error)throw error;if(!data.length)throw new Error('غير مسموح')},
 async remove(id){const {data,error}=await sb.from('resources').delete().eq('id',id).select();if(error)throw error;if(!data.length)throw new Error('غير مسموح')},
 favs(){try{return new Set(JSON.parse(localStorage.getItem('favs')||'[]'))}catch(e){return new Set()}},
 saveFavs(s){try{localStorage.setItem('favs',JSON.stringify([...s]))}catch(e){}}
};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https?:\/\//i.test(String(u))?u:'#';
const COLOR={'درس':'var(--lesson)','امتحان سابق':'var(--exam)','مرجع':'var(--ref)','ملخص':'var(--sum)'};
const noun=n=>n===0?'لا مصادر بعد':n===1?'مصدر واحد':n===2?'مصدران':n<=10?n+' مصادر':n+' مصدراً';
let tm;
const norm=s=>String(s||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
let items=[],favs=Store.favs(),spec=SPECIALTIES[0],sem,mod=null,type='الكل',fav=false,q='',role=null,pview='pending';
const isAdmin=()=>role==='admin';
const published=()=>items.filter(i=>i.spec===spec.id&&i.status==='published');

function reset(){clearTimeout(tm);sem=Object.keys(spec.semesters)[0];mod=null;type='الكل';fav=false;q='';$('#q').value='';$('#favOnly').setAttribute('aria-pressed','false')}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2600)}
function showSkeleton(){$('#modGrid').innerHTML=Array(6).fill('<div class="sk"></div>').join('');$('#modGrid').setAttribute('aria-busy','true')}

async function checkRole(){
 role=null;const {data:{session}}=await sb.auth.getSession();if(!session)return;
 const uid=session.user.id;
 const a=await sb.from('admins').select('user_id').eq('user_id',uid).maybeSingle();
 if(a.data){role='admin';return}
 const e=await sb.from('editors').select('user_id').eq('user_id',uid).maybeSingle();
 if(e.data)role='editor';
}
function drawAuth(){
 $('#login').hidden=!!role;$('#logout').hidden=!role;$('#addBtn').hidden=!role;$('#panelBtn').hidden=!role;
 $('#addBtn').textContent=isAdmin()?'+ إضافة مصدر':'+ اقتراح مصدر';
 const n=items.filter(i=>i.status==='pending').length;
 $('#panelBtn').textContent=(isAdmin()?'المراجعة':'مساهماتي')+(n?` (${n})`:'');
}
async function reload(){if(!$('#browse').hidden)showSkeleton();try{items=await Store.list()}catch(e){items=[];toast('تعذر تحميل المصادر، تحقق من الاتصال')}drawAuth();render()}

function render(){
 const all=published(),active=q||mod||fav;
 $('#stats').innerHTML=[...(all.length?[[all.length,'مصدر']]:[]),[Object.values(spec.semesters).flat().length,'مادة'],[Object.keys(spec.semesters).length,'فصول']].map(([n,l])=>`<div><b>${n}</b><span>${l}</span></div>`).join('');
 $('#browse').hidden=!!active;$('#results').hidden=!active;
 active?drawResults(all):drawBrowse(all);
 try{history.replaceState(null,'',mod&&!q?'#'+encodeURIComponent(sem+'|'+mod):location.pathname+location.search)}catch(e){}
}
function drawBrowse(all){
 $('#notice').hidden=all.length>0;$('#modGrid').removeAttribute('aria-busy');
 $('#sems').innerHTML=Object.keys(spec.semesters).map(s=>`<button class="tab" role="tab" aria-selected="${s===sem}" data-sem="${esc(s)}">${esc(s)}</button>`).join('');
 $('#modGrid').innerHTML=spec.semesters[sem].map((m,idx)=>{
  const l=all.filter(i=>i.sem===sem&&i.mod===m);
  const b=['درس','امتحان سابق','مرجع','ملخص'].map(t=>[t,l.filter(i=>i.type===t).length]).filter(x=>x[1]).map(([t,n])=>`<span class="bd" style="--c:${COLOR[t]}">${n} ${t}</span>`).join('');
  return `<button class="mcard" data-mod="${esc(m)}"><span class="no">${idx+1}</span><h3>${esc(m)}</h3><p>${l.length?noun(l.length):'قريباً'}</p><div class="badges">${b}</div></button>`}).join('')||'<div class="empty" style="grid-column:1/-1"><h3>سيُضاف مقرر هذا الفصل قريباً</h3><p>لم تُحدَّد مواد هذا الفصل بعد.</p></div>';
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
 const cta=role?`<button class="btn" data-open>${isAdmin()?'+ إضافة مصدر':'+ اقتراح مصدر'}</button>`:'';
 $('#list').innerHTML=l.length?l.map(i=>`<article class="item"><span class="tbadge" style="--c:${COLOR[i.type]}">${esc(i.type)}</span><div class="body"><h3>${esc(i.title)}</h3><div class="meta">${esc(i.mod)} – ${esc(i.sem)}${i.year?' – '+esc(i.year):''}</div></div><div class="act"><a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">فتح</a>${isAdmin()?`<button class="del" data-del="${esc(i.id)}">حذف</button>`:''}<button class="star" data-id="${esc(i.id)}" aria-pressed="${favs.has(i.id)}" aria-label="حفظ">★</button></div></article>`).join('')
 :`<div class="empty"><h3>${base?'لا توجد مصادر من هذا النوع':fav?'لم تحفظ أي مصدر بعد':'لا توجد مصادر هنا بعد'}</h3><p>${fav?'اضغط ★ على أي مصدر لحفظه هنا.':'سيُضاف المحتوى قريباً.'}</p>${fav?'':cta}</div>`;
}
function drawPanel(){
 const admin=isAdmin(),st=admin?pview:'pending';
 $('#ptitle').textContent=admin?'مراجعة المصادر':'مساهماتي قيد المراجعة';
 $('#ptabs').hidden=!admin;
 $('#ptabs').innerHTML=admin?[['pending','قيد المراجعة'],['hidden','المخفية']].map(([k,l])=>`<button class="tab" aria-selected="${k===pview}" data-pv="${k}">${l}</button>`).join(''):'';
 const l=items.filter(i=>i.status===st);
 const acts=i=>admin?(st==='pending'?`<button class="ok" data-st="published" data-pid="${esc(i.id)}">قبول</button><button class="del" data-st="hidden" data-pid="${esc(i.id)}">رفض</button>`:`<button class="ok" data-st="published" data-pid="${esc(i.id)}">استرجاع</button><button class="del" data-pdel="${esc(i.id)}">حذف</button>`):`<button class="del" data-pdel="${esc(i.id)}">سحب</button>`;
 $('#plist').innerHTML=l.length?l.map(i=>`<article class="pitem"><div class="body"><h3>${esc(i.title)}</h3><div class="meta">${esc(i.type)} – ${esc(i.mod)} – ${esc(i.sem)}${i.year?' – '+esc(i.year):''}</div><a class="plink" href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">معاينة الرابط ↗</a></div><div class="act">${acts(i)}</div></article>`).join(''):'<div class="empty"><p>لا توجد عناصر هنا.</p></div>';
}
function fillForm(s,m){
 const f=$('#add');f.sem.innerHTML=Object.keys(spec.semesters).map(x=>`<option>${esc(x)}</option>`).join('');
 f.sem.value=s||sem;
 const fm=()=>{f.mod.innerHTML=spec.semesters[f.sem.value].map(x=>`<option>${esc(x)}</option>`).join('')};
 f.sem.onchange=fm;fm();if(m)f.mod.value=m;
}
function checkUrl(u){
 let x;try{x=new URL(u)}catch(e){return'الرابط غير صالح'}
 if(x.protocol!=='https:')return'يجب أن يبدأ الرابط بـ https://';
 if(/\.(exe|msi|bat|cmd|sh|js|jar|apk|scr|ps1|vbs|dmg)$/i.test(x.pathname))return'نوع الملف غير مسموح';
 const ok=ALLOWED_HOSTS.some(h=>x.hostname===h||x.hostname.endsWith('.'+h));
 if(!ok&&!confirm('هذا الرابط ليس من المواقع المعتمدة ('+x.hostname+'). هل أنت متأكد من سلامته؟'))return'تم إلغاء الإضافة';
 return'';
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-sem],[data-mod],[data-type],[data-id],[data-open],[data-del],[data-pv],[data-pid],[data-pdel]');if(!t)return;
 const d=t.dataset;
 if('sem'in d){sem=d.sem;render()}
 else if('mod'in d){mod=d.mod;type='الكل';render();scrollTo({top:0,behavior:'smooth'})}
 else if('type'in d){type=d.type;render()}
 else if('id'in d){favs.has(d.id)?favs.delete(d.id):favs.add(d.id);Store.saveFavs(favs);render()}
 else if('open'in d){if(!role)return;$('#atitle').textContent=isAdmin()?'إضافة مصدر جديد':'اقتراح مصدر';$('#asubmit').textContent=isAdmin()?'نشر المصدر':'إرسال للمراجعة';fillForm(sem,mod);$('#dlg').showModal()}
 else if('del'in d){if(!isAdmin()||!confirm('حذف هذا المصدر نهائياً؟'))return;
  Store.remove(d.del).then(()=>{items=items.filter(i=>i.id!==d.del);render();toast('تم الحذف')}).catch(()=>toast('تعذر الحذف'))}
 else if('pv'in d){pview=d.pv;drawPanel()}
 else if('pid'in d){const id=d.pid,st=d.st;
  if(st==='hidden'&&!confirm('رفض هذا المصدر؟ سيُخفى عن العموم.'))return;
  Store.setStatus(id,st).then(()=>{const it=items.find(i=>i.id===id);if(it)it.status=st;drawAuth();drawPanel();render();toast(st==='published'?'تم النشر':'تم الرفض')}).catch(()=>toast('تعذر تنفيذ العملية'))}
 else if('pdel'in d){if(!confirm('حذف هذا المصدر نهائياً؟'))return;
  Store.remove(d.pdel).then(()=>{items=items.filter(i=>i.id!==d.pdel);drawAuth();drawPanel();render();toast('تم الحذف')}).catch(()=>toast('تعذر الحذف'))}
});
$('#back').onclick=()=>{reset();render()};
$('#home').onclick=e=>{e.preventDefault();reset();render()};
$('#favOnly').onclick=e=>{fav=!fav;e.currentTarget.setAttribute('aria-pressed',fav);render()};
const DEBOUNCE_MS=300; // زمن الانتظار بعد توقف الكتابة (بالميلي ثانية)
$('#q').addEventListener('input',e=>{clearTimeout(tm);const v=e.target.value;tm=setTimeout(()=>{q=v.trim().slice(0,100);type='الكل';render()},DEBOUNCE_MS)});
$('#spec').onchange=e=>{spec=SPECIALTIES.find(s=>s.id===e.target.value);reset();render()};
$('#cancel').onclick=()=>$('#dlg').close();
$('#panelBtn').onclick=()=>{pview='pending';drawPanel();$('#pdlg').showModal()};
$('#pclose').onclick=()=>$('#pdlg').close();
$('#add').onsubmit=async e=>{e.preventDefault();
 const d=Object.fromEntries(new FormData(e.target));d.spec=spec.id;
 if(!d.mod){toast('لا توجد مواد في هذا الفصل بعد');return}
 const bad=checkUrl(d.url);if(bad){toast(bad);return}
 const status=isAdmin()?'published':'pending';
 try{const r=await Store.add(d,status);items.unshift(r);$('#dlg').close();e.target.reset();drawAuth();
  if(status==='published'){reset();sem=d.sem;mod=d.mod;render();toast('تم نشر المصدر')}else toast('أُرسل المصدر للمراجعة. شكراً لمساهمتك')}
 catch(err){toast('تعذر الحفظ: '+(err.message||'خطأ غير معروف'))}
};
$('#login').onclick=()=>{$('#authmsg').textContent='';$('#ldlg').showModal()};
$('#lcancel').onclick=()=>$('#ldlg').close();
$('#lform').onsubmit=async e=>{e.preventDefault();const f=e.target;
 const {error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
 if(error){$('#authmsg').textContent='بيانات الدخول غير صحيحة.';return}
 await checkRole();
 if(!role){await sb.auth.signOut();$('#authmsg').textContent='هذا الحساب ليس ضمن فريق المنصة.';return}
 f.reset();$('#ldlg').close();await reload();toast(isAdmin()?'مرحباً بك أيها المشرف':'مرحباً بك. مساهماتك تُراجَع قبل النشر');
};
$('#logout').onclick=async()=>{await sb.auth.signOut();role=null;await reload();toast('تم تسجيل الخروج')};
(function theme(){
 let t;try{t=localStorage.getItem('theme')}catch(e){}
 document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
 $('#theme').onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};
})();
(async()=>{
 $('#brand').textContent=SITE.brand;$('#school').textContent=SITE.school;$('#headline').textContent=SITE.headline;$('#sub').textContent=SITE.sub;$('#foot-school').textContent=SITE.school;
 $('#spec').innerHTML=SPECIALTIES.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 showSkeleton();await checkRole();reset();
 try{const [s,m]=decodeURIComponent(location.hash.slice(1)).split('|');if(spec.semesters[s]&&spec.semesters[s].includes(m)){sem=s;mod=m}}catch(e){}
 await reload();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();

const sb=supabase.createClient(SUPABASE.url,SUPABASE.key);
const fix=r=>({...r,mod:r.module});
const Store={
 async list(){const {data,error}=await sb.from('resources').select('*').order('created_at',{ascending:false});if(error)throw error;return data.map(fix)},
 async add(d,status){const {data,error}=await sb.from('resources').insert({spec:d.spec,sem:d.sem,module:d.mod,type:d.type,title:d.title,url:d.url,year:d.year||null,status}).select().single();if(error)throw error;return fix(data)},
 async update(id,d,extra){const {data,error}=await sb.from('resources').update({sem:d.sem,module:d.mod,type:d.type,title:d.title,url:d.url,year:d.year||null,...extra}).eq('id',id).select();if(error)throw error;if(!data.length)throw new Error('غير مسموح');return fix(data[0])},
 async setStatus(id,status,note){const {data,error}=await sb.from('resources').update({status,review_note:status==='rejected'?(note||null):null}).eq('id',id).select();if(error)throw error;if(!data.length)throw new Error('غير مسموح');return fix(data[0])},
 async remove(id){const {data,error}=await sb.from('resources').delete().eq('id',id).select();if(error)throw error;if(!data.length)throw new Error('غير مسموح')},
 async report(id,reason,note){const {error}=await sb.from('reports').insert({resource_id:id,reason,note:note||null});if(error)throw error},
 async openReports(){const {data,error}=await sb.from('reports').select('*').eq('status','open').order('created_at',{ascending:false});if(error)throw error;return data},
 async closeReport(id){const {data,error}=await sb.from('reports').update({status:'done'}).eq('id',id).select();if(error)throw error;if(!data.length)throw new Error('غير مسموح')},
 favs(){try{return new Set(JSON.parse(localStorage.getItem('favs')||'[]'))}catch(e){return new Set()}},
 saveFavs(s){try{localStorage.setItem('favs',JSON.stringify([...s]))}catch(e){}}
};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https?:\/\//i.test(String(u))?u:'#';
// عند الضغط على رابط «إعادة تعيين كلمة المرور» في البريد
sb.auth.onAuthStateChange(ev=>{if(ev==='PASSWORD_RECOVERY'){$('#npmsg').textContent='';if(!$('#npdlg').open)$('#npdlg').showModal()}});
const COLOR={'درس':'var(--lesson)','امتحان سابق':'var(--exam)','مرجع':'var(--ref)','ملخص':'var(--sum)'};
const noun=n=>n===0?'لا مصادر بعد':n===1?'مصدر واحد':n===2?'مصدران':n<=10?n+' مصادر':n+' مصدراً';
let tm;
const norm=s=>String(s||'').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه');
let items=[],favs=Store.favs(),spec=SPECIALTIES[0],sem,mod=null,type='الكل',fav=false,q='',role=null,pview='pending',reports=[],editingId=null,rejectId=null,backToPanel=false;
const isAdmin=()=>role==='admin';
const semOf=id=>spec.semesters.find(s=>s.id===id);
const semName=id=>(semOf(id)||{}).name||id;
const modName=(s,m)=>{const x=semOf(s),y=x&&x.modules.find(k=>k.id===m);return y?y.name:m};
const published=()=>items.filter(i=>i.spec===spec.id&&i.status==='published');

function reset(){clearTimeout(tm);sem=spec.semesters[0].id;mod=null;type='الكل';fav=false;q='';$('#q').value='';$('#favOnly').setAttribute('aria-pressed','false')}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2800)}
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
 const n=items.filter(i=>isAdmin()?i.status==='pending':(i.status==='pending'||i.status==='rejected')).length+(isAdmin()?reports.length:0);
 $('#panelBtn').textContent=(isAdmin()?'المراجعة':'مساهماتي')+(n?` (${n})`:'');
}
async function reload(){
 if(!$('#browse').hidden)showSkeleton();
 try{items=await Store.list()}catch(e){items=[];toast('تعذر تحميل المصادر، تحقق من الاتصال')}
 reports=[];if(isAdmin()){try{reports=await Store.openReports()}catch(e){}}
 drawAuth();render();
}
function render(){
 const all=published(),active=q||mod||fav;
 $('#stats').innerHTML=[...(all.length?[[all.length,'مصدر']]:[]),[spec.semesters.reduce((n,s)=>n+s.modules.length,0),'مادة'],[spec.semesters.length,'فصول']].map(([n,l])=>`<div><b>${n}</b><span>${l}</span></div>`).join('');
 $('#browse').hidden=!!active;$('#results').hidden=!active;
 active?drawResults(all):drawBrowse(all);
 try{history.replaceState(null,'',mod&&!q?'#'+encodeURIComponent(sem+'|'+mod):location.pathname+location.search)}catch(e){}
}
function drawBrowse(all){
 $('#notice').hidden=all.length>0;$('#modGrid').removeAttribute('aria-busy');
 $('#sems').innerHTML=spec.semesters.map(s=>`<button class="tab" role="tab" aria-selected="${s.id===sem}" data-sem="${esc(s.id)}">${esc(s.name)}</button>`).join('');
 const mods=(semOf(sem)||{modules:[]}).modules;
 $('#modGrid').innerHTML=mods.map((m,idx)=>{
  const l=all.filter(i=>i.sem===sem&&i.mod===m.id);
  const b=['درس','امتحان سابق','مرجع','ملخص'].map(t=>[t,l.filter(i=>i.type===t).length]).filter(x=>x[1]).map(([t,n])=>`<span class="bd" style="--c:${COLOR[t]}">${n} ${t}</span>`).join('');
  return `<button class="mcard" data-mod="${esc(m.id)}"><span class="no">${idx+1}</span><h3>${esc(m.name)}</h3><p>${l.length?noun(l.length):'قريباً'}</p><div class="badges">${b}</div></button>`}).join('')||'<div class="empty" style="grid-column:1/-1"><h3>سيُضاف مقرر هذا الفصل قريباً</h3><p>لم تُحدَّد مواد هذا الفصل بعد.</p></div>';
}
function drawResults(all){
 let l=all;
 if(q){const s=norm(q);l=l.filter(i=>norm([i.title,modName(i.sem,i.mod),semName(i.sem),i.year].join(' ')).includes(s))}
 else if(mod)l=l.filter(i=>i.sem===sem&&i.mod===mod);
 if(fav)l=l.filter(i=>favs.has(i.id));
 const base=l.length;
 if(type!=='الكل')l=l.filter(i=>i.type===type);
 $('#rtitle').textContent=q?`نتائج البحث عن «${q}»`:mod?`${semName(sem)} › ${modName(sem,mod)}`:'المحفوظات';
 $('#types').innerHTML=TYPES.map(t=>`<button class="tab" aria-selected="${t===type}" data-type="${t}">${t}</button>`).join('');
 $('#count').textContent=l.length?noun(l.length):'';
 const cta=role?`<button class="btn" data-open>${isAdmin()?'+ إضافة مصدر':'+ اقتراح مصدر'}</button>`:'';
 $('#list').innerHTML=l.length?l.map(i=>`<article class="item"><span class="tbadge" style="--c:${COLOR[i.type]}">${esc(i.type)}</span><div class="body"><h3>${esc(i.title)}</h3><div class="meta">${esc(modName(i.sem,i.mod))} – ${esc(semName(i.sem))}${i.year?' – '+esc(i.year):''}</div></div><div class="act"><a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">فتح</a>${isAdmin()?`<button data-edit="${esc(i.id)}">تعديل</button><button class="del" data-del="${esc(i.id)}">حذف</button>`:''}<button class="rep" data-rep="${esc(i.id)}" aria-label="بلّغ عن مشكلة" title="بلّغ عن مشكلة">⚑</button><button class="star" data-id="${esc(i.id)}" aria-pressed="${favs.has(i.id)}" aria-label="حفظ">★</button></div></article>`).join('')
 :`<div class="empty"><h3>${base?'لا توجد مصادر من هذا النوع':fav?'لم تحفظ أي مصدر بعد':'لا توجد مصادر هنا بعد'}</h3><p>${fav?'اضغط ★ على أي مصدر لحفظه هنا.':'سيُضاف المحتوى قريباً.'}</p>${fav?'':cta}</div>`;
}
function drawPanel(){
 const admin=isAdmin();
 const tabs=admin?[['pending','قيد المراجعة'],['rejected','المرفوضة'],['hidden','المخفية'],['reports','البلاغات'+(reports.length?` (${reports.length})`:'')]]:[['pending','قيد المراجعة'],['rejected','المرفوضة']];
 if(!tabs.some(t=>t[0]===pview))pview='pending';
 $('#ptitle').textContent=admin?'مراجعة المصادر':'مساهماتي';
 $('#ptabs').innerHTML=tabs.map(([k,l])=>`<button class="tab" aria-selected="${k===pview}" data-pv="${k}">${l}</button>`).join('');
 if(admin&&pview==='reports'){
  $('#plist').innerHTML=reports.length?reports.map(r=>{const it=items.find(x=>x.id===r.resource_id);
   return `<article class="pitem"><div class="body"><h3>${esc(it?it.title:'(مصدر محذوف)')}</h3><div class="meta">${esc(r.reason)}${r.note?' – '+esc(r.note):''}</div>${it?`<a class="plink" href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener noreferrer">معاينة الرابط ↗</a>`:''}</div><div class="act">${it?`<button class="del" data-rhide="${esc(r.id)}" data-rres="${esc(r.resource_id)}">إخفاء المصدر</button>`:''}<button data-rdone="${esc(r.id)}">تجاهل</button></div></article>`}).join(''):'<div class="empty"><p>لا توجد بلاغات مفتوحة.</p></div>';
  return}
 const l=items.filter(i=>i.status===pview);
 const acts=i=>{const id=esc(i.id),ed=`<button data-edit="${id}">${admin?'تعديل':(pview==='rejected'?'تعديل وإعادة إرسال':'تعديل')}</button>`;
  if(!admin)return ed+`<button class="del" data-pdel="${id}">سحب</button>`;
  if(pview==='pending')return ed+`<button class="ok" data-st="published" data-pid="${id}">قبول</button><button class="del" data-st="rejected" data-pid="${id}">رفض</button>`;
  return ed+`<button class="ok" data-st="published" data-pid="${id}">استرجاع</button><button class="del" data-pdel="${id}">حذف</button>`};
 $('#plist').innerHTML=l.length?l.map(i=>`<article class="pitem"><div class="body"><h3>${esc(i.title)}</h3><div class="meta">${esc(i.type)} – ${esc(modName(i.sem,i.mod))} – ${esc(semName(i.sem))}${i.year?' – '+esc(i.year):''}</div>${i.review_note?`<div class="note">سبب الرفض: ${esc(i.review_note)}</div>`:''}<a class="plink" href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">معاينة الرابط ↗</a></div><div class="act">${acts(i)}</div></article>`).join(''):'<div class="empty"><p>لا توجد عناصر هنا.</p></div>';
}
function fillForm(s,m){
 const f=$('#add');f.sem.innerHTML=spec.semesters.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 f.sem.value=s||sem;
 const fm=()=>{f.mod.innerHTML=((semOf(f.sem.value)||{modules:[]}).modules).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')};
 f.sem.onchange=fm;fm();if(m)f.mod.value=m;
}
function openEdit(id){
 const it=items.find(i=>i.id===id);if(!it)return;
 editingId=id;backToPanel=$('#pdlg').open;
 $('#atitle').textContent='تعديل مصدر';$('#asubmit').textContent=isAdmin()?'حفظ التعديل':'حفظ وإعادة الإرسال للمراجعة';
 fillForm(it.sem,it.mod);const f=$('#add');f.type.value=it.type;f.title.value=it.title;f.year.value=it.year||'';f.url.value=it.url;
 if($('#pdlg').open)$('#pdlg').close();
 $('#dlg').showModal();
}
function checkUrl(u){
 let x;try{x=new URL(u)}catch(e){return'الرابط غير صالح'}
 if(x.protocol!=='https:')return'يجب أن يبدأ الرابط بـ https://';
 if(/\.(exe|msi|bat|cmd|sh|js|jar|apk|scr|ps1|vbs|dmg)$/i.test(x.pathname))return'نوع الملف غير مسموح';
 const ok=ALLOWED_HOSTS.some(h=>x.hostname===h||x.hostname.endsWith('.'+h));
 if(!ok&&!confirm('هذا الرابط ليس من المواقع المعتمدة ('+x.hostname+'). هل أنت متأكد من سلامته؟'))return'تم إلغاء الإضافة';
 return'';
}
function swap(r){items=items.map(i=>i.id===r.id?r:i)}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-sem],[data-mod],[data-type],[data-id],[data-open],[data-del],[data-pv],[data-pid],[data-pdel],[data-rep],[data-rhide],[data-rdone],[data-edit]');if(!t)return;
 const d=t.dataset;
 if('sem'in d){sem=d.sem;render()}
 else if('mod'in d){mod=d.mod;type='الكل';render();scrollTo({top:0,behavior:'smooth'})}
 else if('type'in d){type=d.type;render()}
 else if('id'in d){favs.has(d.id)?favs.delete(d.id):favs.add(d.id);Store.saveFavs(favs);render()}
 else if('open'in d){if(!role)return;editingId=null;$('#add').reset();$('#atitle').textContent=isAdmin()?'إضافة مصدر جديد':'اقتراح مصدر';$('#asubmit').textContent=isAdmin()?'نشر المصدر':'إرسال للمراجعة';fillForm(sem,mod);$('#dlg').showModal()}
 else if('edit'in d){if(role)openEdit(d.edit)}
 else if('del'in d){if(!isAdmin()||!confirm('حذف هذا المصدر نهائياً؟'))return;
  Store.remove(d.del).then(()=>{items=items.filter(i=>i.id!==d.del);drawAuth();render();toast('تم الحذف')}).catch(()=>toast('تعذر الحذف'))}
 else if('pv'in d){pview=d.pv;drawPanel()}
 else if('pid'in d){const id=d.pid,st=d.st;
  if(st==='rejected'){rejectId=id;$('#qform').reset();$('#qdlg').showModal();return}
  Store.setStatus(id,st).then(r=>{swap(r);drawAuth();drawPanel();render();toast('تم النشر')}).catch(()=>toast('تعذر تنفيذ العملية'))}
 else if('rep'in d){openReport(d.rep)}
 else if('rhide'in d){const rid=d.rhide,res=d.rres;if(!isAdmin()||!confirm('إخفاء هذا المصدر عن العموم؟'))return;
  Store.setStatus(res,'hidden').then(r=>{swap(r);return Store.closeReport(rid)}).then(()=>{reports=reports.filter(r=>r.id!==rid);drawAuth();drawPanel();render();toast('أُخفي المصدر وأُغلق البلاغ')}).catch(()=>toast('تعذر تنفيذ العملية'))}
 else if('rdone'in d){if(!isAdmin())return;Store.closeReport(d.rdone).then(()=>{reports=reports.filter(r=>r.id!==d.rdone);drawAuth();drawPanel();toast('أُغلق البلاغ')}).catch(()=>toast('تعذر تنفيذ العملية'))}
 else if('pdel'in d){if(!confirm('حذف هذا المصدر نهائياً؟'))return;
  Store.remove(d.pdel).then(()=>{items=items.filter(i=>i.id!==d.pdel);drawAuth();drawPanel();render();toast('تم الحذف')}).catch(()=>toast('تعذر الحذف'))}
});
const REPORTED=(()=>{try{return new Set(JSON.parse(localStorage.getItem('reported')||'[]'))}catch(e){return new Set()}})();
let lastReport=0,reportId=null;
function openReport(id){if(REPORTED.has(id)){toast('سبق أن بلّغت عن هذا المصدر. شكراً لك');return}reportId=id;$('#rform').reset();$('#rdlg').showModal()}
$('#rcancel').onclick=()=>$('#rdlg').close();
$('#rform').onsubmit=async e=>{e.preventDefault();const f=e.target;
 if(f.website.value){$('#rdlg').close();return}
 if(Date.now()-lastReport<30000){toast('انتظر قليلاً قبل إرسال بلاغ آخر');return}
 try{await Store.report(reportId,f.reason.value,f.note.value.trim().slice(0,300));
  lastReport=Date.now();REPORTED.add(reportId);try{localStorage.setItem('reported',JSON.stringify([...REPORTED]))}catch(x){}
  $('#rdlg').close();toast('وصل بلاغك. شكراً لمساعدتك')}
 catch(err){toast('تعذر إرسال البلاغ، حاول لاحقاً')}};
$('#aboutBtn').onclick=()=>$('#adlg').showModal();
$('#aclose').onclick=()=>$('#adlg').close();
$('#back').onclick=()=>{reset();render()};
$('#home').onclick=e=>{e.preventDefault();reset();render()};
$('#favOnly').onclick=e=>{fav=!fav;e.currentTarget.setAttribute('aria-pressed',fav);render()};
const DEBOUNCE_MS=300; // زمن الانتظار بعد توقف الكتابة (بالميلي ثانية)
$('#q').addEventListener('input',e=>{clearTimeout(tm);const v=e.target.value;tm=setTimeout(()=>{q=v.trim().slice(0,100);type='الكل';render()},DEBOUNCE_MS)});
$('#spec').onchange=e=>{spec=SPECIALTIES.find(s=>s.id===e.target.value);reset();render()};
$('#cancel').onclick=()=>$('#dlg').close();
$('#dlg').addEventListener('close',()=>{editingId=null;if(backToPanel){backToPanel=false;drawPanel();$('#pdlg').showModal()}});
$('#panelBtn').onclick=()=>{pview='pending';drawPanel();$('#pdlg').showModal()};
$('#pclose').onclick=()=>$('#pdlg').close();
$('#chgpw').onclick=()=>{$('#pdlg').close();$('#npmsg').textContent='';$('#npdlg').showModal()};
$('#add').onsubmit=async e=>{e.preventDefault();
 const d=Object.fromEntries(new FormData(e.target));d.spec=spec.id;
 if(!d.mod){toast('لا توجد مواد في هذا الفصل بعد');return}
 const bad=checkUrl(d.url);if(bad){toast(bad);return}
 const id=editingId;
 try{
  if(id){
   const r=await Store.update(id,d,isAdmin()?{}:{status:'pending',review_note:null});
   swap(r);$('#dlg').close();drawAuth();render();toast(isAdmin()?'تم حفظ التعديل':'أُعيد إرسال المصدر للمراجعة');
  }else{
   const status=isAdmin()?'published':'pending';
   const r=await Store.add(d,status);items.unshift(r);$('#dlg').close();e.target.reset();drawAuth();
   if(status==='published'){reset();sem=d.sem;mod=d.mod;render();toast('تم نشر المصدر')}else toast('أُرسل المصدر للمراجعة. شكراً لمساهمتك')}
 }catch(err){toast('تعذر الحفظ: '+(err.message||'خطأ غير معروف'))}
};
$('#qcancel').onclick=()=>$('#qdlg').close();
$('#qform').onsubmit=e=>{e.preventDefault();const note=e.target.note.value.trim().slice(0,300);
 Store.setStatus(rejectId,'rejected',note).then(r=>{swap(r);$('#qdlg').close();drawAuth();drawPanel();render();toast('تم الرفض وأُرسل السبب للمحرّر')}).catch(()=>toast('تعذر تنفيذ العملية'))};
const authMsg=(t,ok)=>{const e=$('#authmsg');e.textContent=t;e.style.color=ok?'var(--lesson)':''};
$('#login').onclick=()=>{authMsg('');$('#ldlg').showModal()};
$('#lcancel').onclick=()=>$('#ldlg').close();
$('#forgot').onclick=async()=>{const em=$('#lform').email.value.trim();
 if(!em){authMsg('اكتب بريدك أولاً ثم اضغط «نسيت كلمة المرور».');return}
 try{await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname.replace(/index\.html$/,'')})}catch(e){}
 authMsg('إن كان البريد مسجلاً فستصله رسالة فيها رابط لتعيين كلمة مرور جديدة.',true)};
$('#lform').onsubmit=async e=>{e.preventDefault();const f=e.target;
 const {error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
 if(error){authMsg('بيانات الدخول غير صحيحة.');return}
 await checkRole();
 if(!role){await sb.auth.signOut();authMsg('هذا الحساب ليس ضمن فريق المنصة.');return}
 f.reset();$('#ldlg').close();await reload();toast(isAdmin()?'مرحباً بك أيها المشرف':'مرحباً بك. مساهماتك تُراجَع قبل النشر');
};
$('#npcancel').onclick=()=>$('#npdlg').close();
$('#npform').onsubmit=async e=>{e.preventDefault();const f=e.target,m=$('#npmsg');
 if(f.p1.value!==f.p2.value){m.textContent='كلمتا المرور غير متطابقتين.';return}
 if(f.p1.value.length<10){m.textContent='يجب ألا تقل كلمة المرور عن 10 أحرف.';return}
 const {error}=await sb.auth.updateUser({password:f.p1.value});
 if(error){m.textContent='تعذر حفظ كلمة المرور. جرّب كلمة أقوى أو أعد المحاولة.';return}
 f.reset();$('#npdlg').close();await checkRole();await reload();toast('تم تغيير كلمة المرور');
};
$('#logout').onclick=async()=>{await sb.auth.signOut();role=null;await reload();toast('تم تسجيل الخروج')};
(function theme(){
 let t;try{t=localStorage.getItem('theme')}catch(e){}
 document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
 $('#theme').onclick=()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('theme',n)}catch(e){}};
})();
(async()=>{
 $('#brand').textContent=SITE.brand;$('#school').textContent=SITE.school;$('#headline').textContent=SITE.headline;$('#sub').textContent=SITE.sub;$('#foot-school').textContent=SITE.school;
 $('#contact').innerHTML=SITE.contact?`للتواصل: <a href="mailto:${esc(SITE.contact)}">${esc(SITE.contact)}</a>`:'سيُضاف بريد التواصل قريباً.';
 $('#spec').innerHTML=SPECIALTIES.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 showSkeleton();await checkRole();reset();
 try{const [s,m]=decodeURIComponent(location.hash.slice(1)).split('|');const S=spec.semesters.find(x=>x.id===s);if(S&&S.modules.some(k=>k.id===m)){sem=s;mod=m}}catch(e){}
 await reload();
 if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();

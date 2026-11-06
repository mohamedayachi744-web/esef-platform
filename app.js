// طبقة التخزين: حالياً في المتصفح. لاحقاً نستبدلها بقاعدة بيانات مشتركة دون تغيير باقي الكود.
const Store={
 async list(){try{return JSON.parse(localStorage.getItem('resources')||'[]')}catch(e){return[]}},
 async add(item){const all=await this.list();all.unshift(item);try{localStorage.setItem('resources',JSON.stringify(all))}catch(e){}},
 favs(){try{return new Set(JSON.parse(localStorage.getItem('favs')||'[]'))}catch(e){return new Set()}},
 saveFavs(s){try{localStorage.setItem('favs',JSON.stringify([...s]))}catch(e){}}
};
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],favs=Store.favs(),spec=SPECIALTIES[0],sem='الكل',mod='الكل',type='الكل',onlyFav=false;
const chips=(list,cur,k)=>list.map(t=>`<button class="chip" data-k="${k}" data-v="${esc(t)}" aria-pressed="${t===cur}">${esc(t)}</button>`).join('');
function drawFilters(){
 const sems=Object.keys(spec.semesters);
 const mods=sem==='الكل'?[...new Set(Object.values(spec.semesters).flat())]:spec.semesters[sem];
 $('#sems').innerHTML=chips(['الكل',...sems],sem,'sem');
 $('#mods').innerHTML=chips(['الكل',...mods],mod,'mod');
 $('#types').innerHTML=chips(TYPES,type,'type');
}
function drawForm(){
 const sems=Object.keys(spec.semesters);
 $('[name=sem]').innerHTML=sems.map(s=>`<option>${s}</option>`).join('');
 const fm=()=>{$('[name=mod]').innerHTML=spec.semesters[$('[name=sem]').value].map(m=>`<option>${m}</option>`).join('')};
 $('[name=sem]').onchange=fm;fm();
}
function render(){
 const q=$('#q').value.trim().toLowerCase();
 const res=items.filter(i=>i.spec===spec.id&&(sem==='الكل'||i.sem===sem)&&(mod==='الكل'||i.mod===mod)&&(type==='الكل'||i.type===type)&&(!onlyFav||favs.has(i.id))&&(!q||[i.title,i.mod,i.year,i.sem].join(' ').toLowerCase().includes(q)));
 $('#count').textContent=res.length?`${res.length} مصدر`:'';
 $('#list').innerHTML=res.length?res.map(i=>`<article class="item"><div class="bar"></div><div class="body"><h3>${esc(i.title)}</h3><div class="meta"><span>${esc(i.type)}</span><span>${esc(i.mod)}</span><span>${esc(i.sem)}</span>${i.year?`<span>${esc(i.year)}</span>`:''}</div></div><div class="act"><a href="${esc(i.url)}" target="_blank" rel="noopener">فتح</a><button class="star" data-id="${i.id}" aria-pressed="${favs.has(i.id)}">${favs.has(i.id)?'محفوظ':'احفظ'}</button></div></article>`).join('')
 :'<div class="empty">لا توجد مصادر هنا بعد. كن أول من يشارك درساً أو امتحاناً أو مرجعاً من النموذج بالأسفل.</div>';
}
document.addEventListener('click',e=>{const t=e.target;
 if(t.dataset.k){if(t.dataset.k==='sem'){sem=t.dataset.v;mod='الكل'}else if(t.dataset.k==='mod')mod=t.dataset.v;else type=t.dataset.v;drawFilters();render()}
 if(t.dataset.id){favs.has(t.dataset.id)?favs.delete(t.dataset.id):favs.add(t.dataset.id);Store.saveFavs(favs);render()}});
$('#favOnly').onclick=e=>{onlyFav=!onlyFav;e.target.setAttribute('aria-pressed',onlyFav);render()};
$('#q').addEventListener('input',render);
$('#spec').onchange=e=>{spec=SPECIALTIES.find(s=>s.id===e.target.value);sem=mod='الكل';drawFilters();drawForm();render()};
$('#add').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.id='u'+Date.now();d.spec=spec.id;
 await Store.add(d);items.unshift(d);e.target.reset();drawForm();render()};
(async()=>{
 $('#school').textContent=SITE.school;$('#title').textContent=SITE.title;
 $('#spec').innerHTML=SPECIALTIES.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
 items=await Store.list();drawFilters();drawForm();render();
})();

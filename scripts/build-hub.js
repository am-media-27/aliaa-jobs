#!/usr/bin/env node
// Build index.html (desktop) and mobile.html (iPad) from data/state.json
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const state = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'state.json'), 'utf8'));

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function js(s){ return JSON.stringify(String(s||'')); }
function chipColor(fit){
  return { strong:['#0f7a43','#e6f5ec','★ Strong'], stretch:['#6d28d9','#efe9fc','Stretch'], look:['#b05c09','#fbedd7','Look'], junior:['#5c6473','#ebedf1','Junior'] }[fit] || ['#5c6473','#ebedf1', fit];
}
function actions(item, type){
  const buttons = [];
  if (item.url) buttons.push(`<a class="btn btn-primary" href="${esc(item.url)}" target="_blank" rel="noopener">${type==='job'?'Open listing':'Open post'} →</a>`);
  if (item.email) buttons.push(`<a class="btn" href="mailto:${esc(item.email)}">Email →</a>`);
  if (item.coldEmail) buttons.push(`<button class="btn" onclick="copyText(this, ${js(item.coldEmail)})">Copy email</button>`);
  if (item.dm) buttons.push(`<button class="btn" onclick="copyText(this, ${js(item.dm)})">Copy DM</button>`);
  return buttons.join(' ');
}
function postCard(p){
  const [col,bg,lbl] = chipColor(p.fit);
  return `<div class="card">
    <div class="row"><span class="chip" style="color:${col};background:${bg}">${lbl}</span><span class="posted">${esc(p.posted)}</span></div>
    <h3>${esc(p.title)}</h3>
    <div class="company">${esc(p.author)}</div>
    ${p.email ? `<div class="contact"><b>Apply to:</b> ${esc(p.email)}</div>` : ''}
    <div class="location">${esc(p.content)}</div>
    <div class="actions">${actions(p,'post')}</div>
  </div>`;
}
function jobCard(j){
  const [col,bg,lbl] = chipColor(j.fit);
  return `<div class="card">
    <div class="row"><span class="chip" style="color:${col};background:${bg}">${lbl}</span><span class="chip-pl">${esc(j.platform)}</span><span class="posted">${esc(j.posted)}</span></div>
    <h3>${esc(j.title)}</h3>
    <div class="company">${esc(j.company)}${j.salary?` · <b>${esc(j.salary)}</b>`:''}</div>
    <div class="location">${esc(j.location)}</div>
    ${j.contact ? `<div class="contact"><b>Contact:</b> ${esc(j.contact)}${j.email?` · ${esc(j.email)}`:''}</div>` : ''}
    <div class="actions">${actions(j,'job')}</div>
  </div>`;
}
function packCard(p){
  return `<div class="card">
    <h3>${esc(p.role)}</h3>
    <div class="company">${esc(p.company)} · ${esc(p.route)}${p.email?' · '+esc(p.email):''}</div>
    <div class="location">${esc(p.lead)}</div>
    <div class="actions">
      <a class="btn btn-primary" href="${esc(p.url)}" target="_blank" rel="noopener">Open →</a>
      ${p.email ? `<a class="btn" href="mailto:${esc(p.email)}">Email →</a>` : ''}
      ${p.msg ? `<button class="btn" onclick="copyText(this, ${js(p.msg)})">Copy message</button>` : ''}
    </div>
  </div>`;
}
function contactCard(c){
  return `<div class="card">
    <h3>${esc(c.name)}</h3>
    <div class="company"><b>${esc(c.title)}</b>${c.company?' · '+esc(c.company):''}</div>
    ${c.email ? `<div class="contact">${esc(c.email)}</div>` : ''}
    <div class="actions">
      ${c.linkedin ? `<a class="btn btn-primary" href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn →</a>` : ''}
      ${c.email ? `<a class="btn" href="mailto:${esc(c.email)}">Email →</a>` : ''}
      ${c.coldEmail ? `<button class="btn" onclick="copyText(this, ${js(c.coldEmail)})">Copy email</button>` : ''}
      ${c.msg ? `<button class="btn" onclick="copyText(this, ${js(c.msg)})">Copy DM</button>` : ''}
    </div>
  </div>`;
}

const fitOrder = {strong:0,look:1,stretch:2,junior:3};
const sorted = (arr,key='fit') => arr.slice().sort((a,b)=>(fitOrder[a[key]]||9)-(fitOrder[b[key]]||9));
const posts = sorted(state.posts || []);
const jobs = sorted(state.jobs || []);
const packs = state.packs || [];
const contacts = state.contacts || [];

const counts = {
  posts: posts.length, jobs: jobs.length, packs: packs.length, contacts: contacts.length,
  postsStrong: posts.filter(p=>p.fit==='strong').length,
  jobsStrong: jobs.filter(j=>j.fit==='strong').length,
  contactsWithEmail: contacts.filter(c=>c.email).length,
};
const today = new Date().toISOString().slice(0,10);

// Companies for Packs filter
const packCompanies = [...new Set(packs.map(p=>p.company).filter(Boolean))].sort();

const CSS = `
  :root{ --bg:#f4f5fa;--card:#fff;--ink:#1a1e2c;--muted:#586173;--faint:#8b93a4;--line:#e3e6ee;
    --brand:#4f46e5;--brand-d:#3730a3;--brand-soft:#eef0fe; }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background:var(--bg);color:var(--ink);line-height:1.5;padding:env(safe-area-inset-top) 14px env(safe-area-inset-bottom)}
  .wrap{max-width:1100px;margin:0 auto}
  .hero{margin:18px 0;padding:24px 26px;border-radius:18px;color:#fff;
    background:linear-gradient(125deg,#312e81 0%,#4f46e5 50%,#7c3aed 100%)}
  .hero h1{font-size:24px;font-weight:700;margin-bottom:6px}
  .hero .sub{opacity:.92;font-size:14px}
  .stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
  .stat{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600}
  .tabs{display:flex;gap:6px;margin:18px 0 14px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
  .tab{background:#fff;border:1px solid var(--line);padding:9px 16px;border-radius:999px;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer;white-space:nowrap;font-family:inherit}
  .tab.active{background:var(--brand);border-color:var(--brand);color:#fff}
  .search{width:100%;padding:11px 16px;border:1px solid var(--line);border-radius:11px;font-size:15px;margin-bottom:14px;font-family:inherit;background:#fff}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(18,22,40,.04)}
  .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px}
  .chip{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;text-transform:uppercase;letter-spacing:.3px}
  .chip-pl{font-size:11px;color:var(--muted);background:#f3f4f9;border:1px solid var(--line);padding:3px 9px;border-radius:999px;font-weight:600}
  .posted{margin-left:auto;font-size:12px;color:var(--faint)}
  h3{font-size:17px;font-weight:600;margin-bottom:4px;line-height:1.3}
  .company{font-size:14px;color:var(--ink);margin-bottom:2px}
  .location{font-size:13px;color:var(--muted);margin-bottom:8px}
  .contact{font-size:13px;background:#fef9ec;border:1px solid #f1d49a;padding:6px 10px;border-radius:8px;margin:6px 0;color:#6f5512}
  .contact b{color:#7a3d05}
  .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .btn{display:inline-block;background:#fff;border:1px solid var(--line);color:var(--ink);padding:8px 14px;border-radius:9px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;font-family:inherit}
  .btn:active{transform:scale(.97)}
  .btn-primary{background:var(--brand);border-color:var(--brand);color:#fff}
  .empty{text-align:center;padding:40px 20px;color:var(--muted)}
  .footer{text-align:center;padding:30px 0;color:var(--faint);font-size:12px}
  .toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1a1e2c;color:#fff;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;opacity:0;transition:opacity .2s;pointer-events:none;z-index:99}
  .toast.show{opacity:1}
  @media (prefers-color-scheme:dark){
    :root{--bg:#0f1117;--card:#1c2030;--ink:#e7e9f0;--muted:#9aa3b8;--faint:#6d7691;--line:#2a2f42;--brand-soft:#252b4d}
    .chip-pl{background:#252939}
    .contact{background:#3a2e15;border-color:#6f5512;color:#fae8c1}
  }
`;
const SCRIPT = `
  const ALL = {
    posts: ${JSON.stringify(posts)},
    jobs: ${JSON.stringify(jobs)},
    packs: ${JSON.stringify(packs)},
    contacts: ${JSON.stringify(contacts)}
  };
  function tpl(type, x){
    if (type==='post') return \`<div class="card"><div class="row"><span class="chip">\${x.fit}</span><span class="posted">\${x.posted}</span></div><h3>\${x.title.replace(/</g,'&lt;')}</h3><div class="company">\${(x.author||'').replace(/</g,'&lt;')}</div>\${x.email?'<div class="contact"><b>Apply to:</b> '+x.email+'</div>':''}<div class="location">\${(x.content||'').replace(/</g,'&lt;')}</div><div class="actions">\${x.url?'<a class="btn btn-primary" href="'+x.url+'" target="_blank">Open post →</a>':''}\${x.email?' <a class="btn" href="mailto:'+x.email+'">Email →</a>':''}\${x.coldEmail?' <button class="btn" onclick=\\'copyText(this, '+JSON.stringify(JSON.stringify(x.coldEmail))+')\\'>Copy email</button>':''}\${x.dm?' <button class="btn" onclick=\\'copyText(this, '+JSON.stringify(JSON.stringify(x.dm))+')\\'>Copy DM</button>':''}</div></div>\`;
    return '';
  }
  function copyText(btn, text){
    const t = typeof text==='string'?text:JSON.parse(text);
    (navigator.clipboard?.writeText(t)||Promise.reject()).then(()=>{
      const ts=document.getElementById('toast');ts.classList.add('show');setTimeout(()=>ts.classList.remove('show'),1500);
    }).catch(()=>{
      const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);
      const ts=document.getElementById('toast');ts.classList.add('show');setTimeout(()=>ts.classList.remove('show'),1500);
    });
  }
  function showPane(name){
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.pane===name));
    document.querySelectorAll('.pane').forEach(p=>p.style.display = p.id==='pane-'+name?'block':'none');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function filterCards(paneId, q){
    q = q.toLowerCase();
    document.querySelectorAll('#'+paneId+' .card').forEach(c=>{
      c.style.display = !q || c.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click', ()=>showPane(t.dataset.pane)));
    document.querySelectorAll('.search').forEach(s=>s.addEventListener('input', e=>filterCards(s.dataset.pane, e.target.value)));
  });
`;

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Aliaa — Job Search Hub</title>
<style>${CSS}</style>
</head><body>
<div class="wrap">
<div class="hero">
  <h1>Aliaa Mohamed — Job Search Hub</h1>
  <div class="sub">Auto-refreshed daily · Last updated ${today}</div>
  <div class="stats">
    <span class="stat">${counts.jobs} jobs (${counts.jobsStrong}★)</span>
    <span class="stat">${counts.posts} hiring posts (${counts.postsStrong}★)</span>
    <span class="stat">${counts.packs} application packs</span>
    <span class="stat">${counts.contacts} contacts (${counts.contactsWithEmail} with email)</span>
  </div>
</div>
<div class="tabs">
  <button class="tab active" data-pane="jobs">All Jobs (${counts.jobs})</button>
  <button class="tab" data-pane="posts">Hiring Posts (${counts.posts})</button>
  <button class="tab" data-pane="packs">Application Packs (${counts.packs})</button>
  <button class="tab" data-pane="contacts">Contacts (${counts.contacts})</button>
</div>
<div class="pane" id="pane-jobs">
  <input type="search" class="search" data-pane="pane-jobs" placeholder="Search jobs by title, company, location…">
  ${jobs.map(jobCard).join('') || '<div class="empty">No jobs in this batch.</div>'}
</div>
<div class="pane" id="pane-posts" style="display:none">
  <input type="search" class="search" data-pane="pane-posts" placeholder="Search posts by title, author, company, email…">
  ${posts.map(postCard).join('') || '<div class="empty">No posts in this batch.</div>'}
</div>
<div class="pane" id="pane-packs" style="display:none">
  <input type="search" class="search" data-pane="pane-packs" placeholder="Search by company name — e.g. Chalhoub, MAF, Spotify…">
  ${packs.map(packCard).join('') || '<div class="empty">No packs yet.</div>'}
</div>
<div class="pane" id="pane-contacts" style="display:none">
  <input type="search" class="search" data-pane="pane-contacts" placeholder="Search by name, title, company, email…">
  ${contacts.map(contactCard).join('') || '<div class="empty">No contacts yet.</div>'}
</div>
<div class="footer">Auto-refreshed daily by GitHub Actions · Source data in <code>data/state.json</code></div>
</div>
<div class="toast" id="toast">Copied to clipboard</div>
<script>${SCRIPT}</script>
</body></html>`;

fs.writeFileSync(path.join(ROOT,'index.html'), html);
fs.writeFileSync(path.join(ROOT,'mobile.html'), html);  // same responsive build serves both
console.log('Wrote index.html + mobile.html');
console.log('Posts:', posts.length, '| Jobs:', jobs.length, '| Packs:', packs.length, '| Contacts:', contacts.length);

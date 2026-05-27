#!/usr/bin/env node
// Load raw scraper output + existing state, filter/dedupe/classify, and write updated state.json
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const RAW = path.join(DATA, 'raw');
const STATE_PATH = path.join(DATA, 'state.json');

const TODAY = new Date();
const CUTOFF = new Date(TODAY.getTime() - 21*24*3600*1000);

function loadRaw(name){
  try { return JSON.parse(fs.readFileSync(path.join(RAW, name + '.json'), 'utf8')); } catch(e){ return []; }
}
function loadState(){
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch(e){ return { posts:[], jobs:[], packs:[], contacts:[] }; }
}

const NICHE = /digital|growth|performance|paid|ppc|sem|seo|crm|lifecycle|retention|ecommerce|e-commerce|online|social media|community manager|media buy|media plan|campaign|marketing analyst|marketing data|business intelligence|power bi|tableau|cdp|braze|salesforce marketing|hubspot|martech|lead gen|acquisition/i;
const EXCLUDE_INDUSTRY = /property|real estate|broker|forex|cfd|trading|hotel|hospitality|hospital|legal|construction|engineer|developer|joinery|architect|fashion consultant|furniture|sales executive|hr |human resource|accountant|chef|cook|driver|nurse|teacher|lecturer|copywriter|video editor|graphic designer|illustrator|photographer|interior|product manager|software|backend|front-?end|devops|cloud engineer|data engineer|salesforce admin|relationship manager|account director.*sales|sales manager|business dev|enterprise account|account executive|client servicing|legal service|partnership manager|broker program/i;
const EXCLUDE_TITLE = /executive$|coordinator|specialist$|assistant|trainee|intern|associate$|junior|cook|hostess|barista|cashier|copywriter|videographer|driver|tester|technician|operator|admin|pa\b|secretary|delivery|account executive|account manager|business development|sales\b|outdoor|enterprise account|nurse|physiotherapist|fashion consultant|design manager|construction manager|project manager|sales manager|talent acquisition|portfolio revenue|revenue management|paralegal|news editor|technical manager|hr manager|finance manager|video editor|sales director/i;
const PR_ONLY = /^public relations|^pr (manager|specialist|exec)|^communications$|press relations/i;
const SENIOR = /head of|director|vp\b|vice president|chief|c[no]o\b|cmo\b/i;
const MANAGER = /\bmanager\b|\blead\b|\bsenior\b/i;
const JUNIOR = /executive$|specialist$|intern|coordinator|associate|junior|trainee/i;

function classifyFit(title){
  if (EXCLUDE_TITLE.test(title)) return 'junior';
  const t = (title||'').toLowerCase();
  if (SENIOR.test(t)) return 'stretch';
  if (JUNIOR.test(t)) return 'junior';
  if (MANAGER.test(t)) return 'strong';
  if (/recruit|talent|hiring/i.test(title)) return 'look';
  return 'look';
}
function inNiche(text){
  if (!text) return false;
  if (PR_ONLY.test(text)) return false;
  if (EXCLUDE_INDUSTRY.test(text)) return false;
  return NICHE.test(text);
}
function inDubai(loc){ return loc && /dubai|abu dhabi|sharjah|uae|united arab/i.test(loc); }
function safe(s){ return (s||'').replace(/\\/g,'\\\\').replace(/"/g,"'").replace(/\r/g,'').replace(/\n/g,'\\n').replace(/\t/g,' '); }
function fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return String(iso);
  const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getUTCDate()+' '+m[d.getUTCMonth()]+' '+d.getUTCFullYear();
}
function parsePosted(s){ if(!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }

const CV = {
  performance: 'Aliaa_Mohamed_CV_ATS_Performance_Marketing.docx',
  growth: 'Aliaa_Mohamed_CV_ATS_Growth_Marketing.docx',
  crm: 'Aliaa_Mohamed_CV_ATS_CRM_Lifecycle.docx',
  master: 'Aliaa_Mohamed_CV_ATS_Master.docx',
};
function pickCv(t){t=(t||'').toLowerCase();
  if (/crm|lifecycle|retention|braze|cdp/.test(t)) return CV.crm;
  if (/growth/.test(t)) return CV.growth;
  if (/performance|paid|ppc|sem|media buy/.test(t)) return CV.performance;
  return CV.master;
}
function pickAngle(t){t=(t||'').toLowerCase();
  if (/crm|lifecycle|retention|braze|cdp/.test(t)) return 'CRM, lifecycle and retention marketing';
  if (/growth/.test(t)) return 'growth and performance marketing';
  if (/performance|paid|ppc|sem|media buy/.test(t)) return 'performance and paid-media marketing';
  if (/ecommerce|e-commerce|online/.test(t)) return 'e-commerce and digital growth';
  if (/social/.test(t)) return 'social media, content and community-led growth';
  if (/analy|data|bi|insight|dashboard|power bi|tableau/.test(t)) return 'marketing analytics and reporting';
  return 'digital marketing across paid, CRM and analytics';
}
function pickHook(t){t=(t||'').toLowerCase();
  if (/crm|lifecycle|retention/.test(t)) return 'CRM is my core - I ran Bloomreach CDP across 1.7M+ profiles and authored a Braze global case study with 40x email revenue';
  if (/growth|performance|paid|ppc|media buy/.test(t)) return '12.5x ROAS across 8 GCC markets, CPA down 80%';
  if (/ecommerce|e-commerce/.test(t)) return "12.5x ROAS across 8 GCC markets, ex-MAF and L'Oreal e-commerce";
  if (/social/.test(t)) return '12.5x ROAS across 8 GCC markets and strong content and community strategy';
  if (/analy|data|bi/.test(t)) return 'Power BI dashboards across 1.7M+ profiles and Bloomreach CDP analytics';
  return '12.5x ROAS across 8 GCC markets and a 40x email-revenue lift';
}
// --- Eid-break greeting — current until ~mid-June 2026 ---
function eidGreeting(){
  // Active for two weeks post Eid al-Adha 2026
  const now = new Date();
  const stop = new Date('2026-06-15');
  return now < stop ? 'I hope you had a good Eid break — ' : '';
}

// Pools so messages don't all look identical
const OPENERS = [
  "your post about the {role} role caught my eye",
  "I saw {company} is hiring a {role} and couldn't scroll past it",
  "your {role} opening at {company} jumped out at me",
  "the {role} role you're hiring for at {company} feels right up my street"
];
const SOFT_ASKS = [
  "Would love to swap notes if you're open to a quick chat?",
  "If timing is right, I'd love to throw my hat in — open to a short call?",
  "Happy to share more if it's helpful — would a 15-min chat work?",
  "If the role is still open I'd genuinely love to be considered — could we chat?"
];
function pick(arr, seed){ return arr[Math.abs(seed) % arr.length]; }
function fillOpener(tmpl, role, company){
  return tmpl.replace('{role}', safe(role)).replace('{company}', company ? safe(company) : 'your team');
}
function seedFor(s){ let h=0; for (const c of String(s)) h = ((h<<5)-h) + c.charCodeAt(0); return h|0; }

function buildColdEmail(role, firstName, email, company){
  const angle = pickAngle(role), cv = pickCv(role);
  const greet = firstName ? ('Hi ' + safe(firstName) + ',') : 'Hi there,';
  const to = email ? ('To: ' + email + '\\n') : '';
  const eid = eidGreeting();
  return to +
    'Subject: Senior marketer interested in your ' + safe(role) + ' role\\n\\n' +
    greet + '\\n\\n' +
    eid + "I came across your " + (company ? "role at " + safe(company) : "role") + " and it genuinely lit me up — it lines up almost exactly with what I love doing in " + angle + ".\\n\\n" +
    "A quick word about me — I'm Dubai-based, 10+ years in digital, growth and CRM across Majid Al Futtaim, L'Oreal and Samsung. Three things I'm especially proud of (and happy to talk through over a coffee):\\n" +
    "\\u2022  Hit 12.5x ROAS on paid media across 8 GCC markets while cutting CPA by 80%\\n" +
    "\\u2022  Rebuilt the CRM on a Bloomreach CDP spanning 1.7M+ customer profiles\\n" +
    "\\u2022  Grew email revenue 40x — Braze featured it as a global case study\\n\\n" +
    "I'd love to be considered. I'm attaching my CV (" + cv + ") and happy to share specific case studies if useful. " + pick(SOFT_ASKS, seedFor(role+company)) + "\\n\\n" +
    "Warm regards,\\nAliaa Mohamed\\nDubai, UAE  \\u00b7  +971 56 261 7228  \\u00b7  aliaa1994@hotmail.co.uk  \\u00b7  linkedin.com/in/aliaa-mohamed-digital-marketing";
}
function buildDm(role, firstName, company){
  const greet = firstName ? ("Hi " + safe(firstName) + " \\u2014 ") : "Hi \\u2014 ";
  const opener = fillOpener(pick(OPENERS, seedFor(role+company)), role, company);
  const eid = eidGreeting();
  // Keep DMs short, warm, and metric-light — one specific value line, soft ask
  const value = pickHook(role).replace(/^CRM is my core - /,"");
  return greet + eid + opener + ". Quick context: I'm Dubai-based, 10+ yrs in digital and growth (ex-MAF, L'Oreal, Samsung) and " + value + ". " + pick(SOFT_ASKS, seedFor(role+company+"dm")) + " \\u2014 Aliaa";
}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);}
const fitOrder = {strong:0, look:1, stretch:2, junior:3};

// -------------- run --------------
const state = loadState();
const existingPostUrls = new Set(state.posts.map(p=>p.url));
const existingJobUrls = new Set(state.jobs.map(j=>j.url));
const existingPackUrls = new Set(state.packs.map(p=>p.url));
const existingContactNames = new Set(state.contacts.map(c=>c.name.toLowerCase().trim()));

// POSTS — 100% coverage rule: never drop a post that mentions hiring + niche + Dubai
// Title extraction failure does NOT drop; uncertain fit defaults to "look"; ALL emails in body are captured.
const postsRaw = loadRaw('posts');
const EMAIL_RE = /[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const HIRE = /\bhiring\b|we['']re hiring|we are hiring|looking for|join (our|us)|join the team|apply|cv to|send (your )?cv|recruit|vacancy|\bposition\b|open role|now hiring/i;
for (const it of postsRaw){
  const url = it.linkedinUrl;
  if (!url || existingPostUrls.has(url)) continue;
  const content = it.content || '';
  const author = (it.author && it.author.name) || it['author.name'] || '';
  const postedDate = (it.postedAt && it.postedAt.date) || it['postedAt.date'] || '';
  const d = parsePosted(postedDate); if (!d || d < CUTOFF) continue;
  if (!/dubai|uae|united arab|abu dhabi|sharjah/i.test(content)) continue;
  if (!HIRE.test(content)) continue;
  if (!inNiche(content)) continue;
  if (EXCLUDE_INDUSTRY.test(content)) continue;

  // Try to extract title — but NEVER drop the post if extraction fails.
  let title = '';
  const m = content.match(/hiring[^a-z]+([A-Z][A-Za-z &\/\-]{3,80}?)(?:\n|\||\(|—|in Dubai|–|-|,)/i) ||
            content.match(/looking for[^a-z]+([A-Z][A-Za-z &\/\-]{3,80}?)(?:\n|\||\(|—|in Dubai|–|-|,)/i) ||
            content.match(/(?:role|position|vacancy)[:\s]+([A-Z][A-Za-z &\/\-]{3,80}?)(?:\n|\||\(|—|–|-|,)/i) ||
            content.match(/^([A-Z][A-Za-z &\/\-]{4,80}?)(?:\n|\||\(|—)/);
  if (m) title = m[1].trim().replace(/[#"]/g,'');
  if (!title || title.length < 5) {
    // Fallback to first non-empty line, otherwise placeholder
    const firstLine = content.split(/\n/).find(l => l.trim().length > 3) || '';
    title = (firstLine.replace(/[#"]/g,'').trim().slice(0,80)) || 'Marketing role — see post';
  }

  // Capture every email in the post body, prefer first non-aggregator one
  const allEmails = [...new Set((content.match(EMAIL_RE)||[]).filter(e=>!/no-?reply|notifications|linkedin|@get9to5jobs/i.test(e)))];
  const email = allEmails[0] || '';

  // Default uncertain fit to "look", not junior
  let fit = classifyFit(title);
  if (fit === 'junior' && !EXCLUDE_TITLE.test(title)) fit = 'look';

  const firstName = author ? author.split(/\s+/)[0] : '';
  const sentence = content.replace(/\n+/g,' ').replace(/\s+/g,' ').trim().slice(0,260) + (content.length>260?'…':'');
  state.posts.unshift({
    fit, title: safe(title), author: safe(author), posted: fmtDate(d.toISOString()),
    url, content: safe(sentence),
    note: safe('Auto-imported — ' + fit + ' fit' + (email ? ' · direct email ' + email : '') + '.'),
    dm: safe(buildDm(title, firstName, '')),
    coldEmail: safe(buildColdEmail(title, firstName, email, '')),
    email,
    allEmails: allEmails.length > 1 ? allEmails : undefined,
    addedOn: TODAY.toISOString().slice(0,10)
  });
  existingPostUrls.add(url);
}

// JOBS
function pushJob(j){
  if (!j.url || existingJobUrls.has(j.url)) return false;
  const key = (j.title+'|'+j.company).toLowerCase();
  if (state.jobs.find(x=>(x.title+'|'+x.company).toLowerCase()===key)) return false;
  state.jobs.unshift(j); existingJobUrls.add(j.url);
  return true;
}
// LinkedIn jobs
for (const it of loadRaw('lijobs')){
  const url = it.link || ''; if (!url) continue;
  const loc = it.location || ''; if (!inDubai(loc)) continue;
  const title = it.title || ''; const company = it.companyName || '';
  if (EXCLUDE_TITLE.test(title) || !inNiche(title) || EXCLUDE_INDUSTRY.test(title+' '+company) || PR_ONLY.test(title)) continue;
  const d = parsePosted(it.postedAt); if (!d || d < CUTOFF) continue;
  const fit = classifyFit(title);
  const contactName = it.jobPosterName || '';
  const firstName = contactName ? contactName.split(/\s+/)[0] : '';
  pushJob({
    platform:'LinkedIn', fit, title: safe(title), company: safe(company),
    location: safe(loc), posted: fmtDate(d.toISOString()), url, salary: safe(it.salary||''),
    note: 'Auto from LinkedIn Jobs - ' + fit + ' fit.',
    contact: contactName || undefined,
    dm: contactName ? safe(buildDm(title, firstName, company)) : undefined,
    email: '', coldEmail: safe(buildColdEmail(title, firstName, '', company)),
    addedOn: TODAY.toISOString().slice(0,10)
  });
}
// Indeed (digital marketing + analyst)
for (const arr of [loadRaw('indeed_dm'), loadRaw('indeed_analyst')]){
  for (const it of arr){
    const url = it.url; if (!url) continue;
    const title = it.title || ''; const company = (it.employer && it.employer.name) || '';
    if (EXCLUDE_TITLE.test(title) || !inNiche(title) || EXCLUDE_INDUSTRY.test(title+' '+company) || PR_ONLY.test(title)) continue;
    const d = parsePosted(it.datePublished || it.dateOnIndeed); if (!d || d < CUTOFF) continue;
    const fit = classifyFit(title);
    const sal = it.baseSalary && it.baseSalary.min ? (it.baseSalary.min+'-'+it.baseSalary.max+' '+it.baseSalary.currencyCode+'/'+it.baseSalary.unitOfWork) : '';
    pushJob({
      platform:'Indeed', fit, title: safe(title), company: safe(company),
      location:'Dubai, UAE', posted: fmtDate(d.toISOString()), url, salary: safe(sal),
      note: 'Auto from Indeed - ' + fit + ' fit.', email: '',
      coldEmail: safe(buildColdEmail(title, '', '', company)),
      addedOn: TODAY.toISOString().slice(0,10)
    });
  }
}
// Bayt
for (const it of loadRaw('bayt')){
  const url = it.url; if (!url || !/dubai/i.test(it.location||'')) continue;
  const title = it.title || ''; const company = it.company || '';
  if (EXCLUDE_TITLE.test(title) || !inNiche(title) || EXCLUDE_INDUSTRY.test(title+' '+company) || PR_ONLY.test(title)) continue;
  if (/30\+/.test(it.postedAtRelative)) continue;
  let d;
  const r = it.postedAtRelative || '';
  if (/today|hour|just/i.test(r)) d = TODAY;
  else if (/yesterday/i.test(r)) d = new Date(TODAY.getTime()-86400000);
  else if (/(\d+)\s*days?/i.test(r)) d = new Date(TODAY.getTime() - parseInt(r.match(/(\d+)/)[1])*86400000);
  else if (/(\d+)\s*weeks?/i.test(r)) d = new Date(TODAY.getTime() - parseInt(r.match(/(\d+)/)[1])*7*86400000);
  else d = TODAY;
  if (d < CUTOFF) continue;
  const fit = classifyFit(title);
  pushJob({
    platform:'Bayt', fit, title: safe(title), company: safe(company),
    location: safe(it.location), posted: fmtDate(d.toISOString()), url, salary: safe(it.salary||''),
    note: 'Auto from Bayt - ' + fit + ' fit.', email: '',
    coldEmail: safe(buildColdEmail(title, '', '', company)),
    addedOn: TODAY.toISOString().slice(0,10)
  });
}
// GulfTalent
for (const it of loadRaw('gulftalent')){
  const url = it.url; if (!url) continue;
  const loc = (it.city||'')+' '+(it.country||''); if (!inDubai(loc)) continue;
  const title = it.title || ''; const company = it.company || '';
  if (EXCLUDE_TITLE.test(title) || !inNiche(title) || EXCLUDE_INDUSTRY.test(title+' '+company)) continue;
  const d = parsePosted(it.postedDate); if (!d || d < CUTOFF) continue;
  const fit = classifyFit(title);
  pushJob({
    platform:'GulfTalent', fit, title: safe(title), company: safe(company),
    location:'Dubai, UAE', posted: fmtDate(d.toISOString()), url, salary: safe(it.salaryRaw||''),
    note: 'Auto from GulfTalent - ' + fit + ' fit.', email: '',
    coldEmail: safe(buildColdEmail(title, '', '', company)),
    addedOn: TODAY.toISOString().slice(0,10)
  });
}

// Drop entries older than CUTOFF
function inWindow(p){
  const d = parsePosted(p.posted && p.posted.replace(/^(\d+) (\w+) (\d+)$/,'$2 $1 $3'));
  return d && d >= CUTOFF;
}
state.posts = state.posts.filter(inWindow);
state.jobs  = state.jobs.filter(inWindow);

// Sort by fit
state.posts.sort((a,b)=>(fitOrder[a.fit]||9)-(fitOrder[b.fit]||9));
state.jobs.sort((a,b)=>(fitOrder[a.fit]||9)-(fitOrder[b.fit]||9));

// PACKS: one per strong job not already packed
let nextN = state.packs.reduce((m,p)=>Math.max(m, p.n||0), 100) + 1;
for (const j of state.jobs.filter(j=>j.fit==='strong')){
  if (existingPackUrls.has(j.url)) continue;
  const n = nextN++;
  state.packs.unshift({
    id: slug(j.title)+'-'+n, n,
    role: '★ '+j.title, company: j.company,
    route: j.email ? 'email' : (j.dm ? 'dm' : 'portal'),
    email: j.email||'', url: j.url,
    reach: 'Apply via ' + j.platform + '.',
    subject: '',
    lead: 'CV: '+pickCv(j.title)+' -- Lead with: '+pickHook(j.title),
    msg: (j.dm || buildDm(j.title, '', j.company)) +
         '\\n----- FOLLOW-UP (4-5 days later if no reply) -----\\nHi again - quick bump on my last note; happy to share my CV and a couple of quick case studies if useful. - Aliaa'
  });
  existingPackUrls.add(j.url);
}

// CONTACTS: add named hiring managers from jobs (just-added ones, not all jobs)
for (const j of state.jobs.filter(j=>j.contact)){
  const name = j.contact.trim();
  if (existingContactNames.has(name.toLowerCase())) continue;
  state.contacts.unshift({
    name: safe(name),
    title: safe('Hiring contact - ' + j.title),
    company: safe(j.company),
    email: '', linkedin: '',
    msg: j.dm,
    cv: pickCv(j.title),
    coldEmail: safe(buildColdEmail(j.title, name.split(' ')[0], '', j.company))
  });
  existingContactNames.add(name.toLowerCase());
}

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 0));
const summary = {
  totalPosts: state.posts.length, totalJobs: state.jobs.length,
  totalPacks: state.packs.length, totalContacts: state.contacts.length,
  postsByFit: state.posts.reduce((a,p)=>(a[p.fit]=(a[p.fit]||0)+1,a),{}),
  jobsByFit: state.jobs.reduce((a,j)=>(a[j.fit]=(a[j.fit]||0)+1,a),{}),
  jobsByPlatform: state.jobs.reduce((a,j)=>(a[j.platform]=(a[j.platform]||0)+1,a),{}),
};
fs.writeFileSync(path.join(DATA,'_process_summary.json'), JSON.stringify(summary, null, 2));
console.log('Process summary:', JSON.stringify(summary, null, 2));
gain - quick bump on my last note; happy to share my CV and a couple of quick case studies if useful. - Aliaa'
  });
  existingPackUrls.add(j.url);
}

// CONTACTS: add named hiring managers from jobs (just-added ones, not all jobs)
for (const j of state.jobs.filter(j=>j.contact)){
  const name = j.contact.trim();
  if (existingContactNames.has(name.toLowerCase())) continue;
  state.contacts.unshift({
    name: safe(name),
    title: safe('Hiring contact - ' + j.title),
    company: safe(j.company),
    email: '', linkedin: '',
    msg: j.dm,
    cv: pickCv(j.title),
    coldEmail: safe(buildColdEmail(j.title, name.split(' ')[0], '', j.company))
  });
  existingContactNames.add(name.toLowerCase());
}

fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 0));
const summary = {
  totalPosts: state.posts.length, totalJobs: state.jobs.length,
  totalPacks: state.packs.length, totalContacts: state.contacts.length,
  postsByFit: state.posts.reduce((a,p)=>(a[p.fit]=(a[p.fit]||0)+1,a),{}),
  jobsByFit: state.jobs.reduce((a,j)=>(a[j.fit]=(a[j.fit]||0)+1,a),{}),
  jobsByPlatform: state.jobs.reduce((a,j)=>(a[j.platform]=(a[j.platform]||0)+1,a),{}),
};
fs.writeFileSync(path.join(DATA,'_process_summary.json'), JSON.stringify(summary, null, 2));
console.log('Process summary:', JSON.stringify(summary, null, 2));

#!/usr/bin/env node
// Trigger the Apify scrapers and save their results to data/raw/*.json
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
  console.error('Missing APIFY_TOKEN env var.');
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, '..', 'data', 'raw');
fs.mkdirSync(DATA_DIR, { recursive: true });

const COMPANIES = [
  'Google','Microsoft','Amazon','Meta','TikTok','Salesforce','Adobe','Oracle','SAP','HubSpot',
  'Canva','Spotify','Netflix','Uber','Booking.com','Careem','Talabat','Noon','Property Finder',
  'Kitopi','Delivery Hero','Chalhoub','Majid Al Futtaim','Emaar','Nestle','Procter & Gamble',
  'Unilever','L\'Oreal','Estee Lauder','PepsiCo','Coca-Cola','Henkel','Reckitt','Beiersdorf','Mondelez',
];
const ROLE_KEYWORDS = [
  'digital marketing manager','performance marketing','media buying','growth marketing',
  'senior growth manager','ecommerce manager','CRM manager','marketing analyst','social media manager'
];

function liUrl(q){
  return 'https://www.linkedin.com/jobs/search/?keywords=' + encodeURIComponent(q) +
    '&location=' + encodeURIComponent('Dubai, United Arab Emirates') + '&f_TPR=r604800';
}

const ACTORS = [
  {
    name: 'posts',
    actor: 'harvestapi~linkedin-post-search',
    input: {
      searchQueries: [
        'digital marketing manager Dubai','performance marketing manager Dubai',
        'growth marketing manager Dubai','senior growth manager Dubai',
        'paid media manager Dubai','media buyer Dubai','ecommerce manager Dubai',
        'CRM manager Dubai','lifecycle marketing manager Dubai','social media manager Dubai',
        'marketing data analyst Dubai','we are hiring digital marketing Dubai',
        'looking for a growth marketer Dubai'
      ],
      maxPosts: 20, postedLimit: 'week', sortBy: 'date'
    }
  },
  {
    name: 'lijobs',
    actor: 'curious_coder~linkedin-jobs-scraper',
    input: {
      urls: [
        ...ROLE_KEYWORDS.map(liUrl),
        ...COMPANIES.map(c => liUrl(c + ' marketing'))
      ],
      count: 150, scrapeCompany: false
    }
  },
  {
    name: 'indeed_dm',
    actor: 'valig~indeed-jobs-scraper',
    input: { country: 'ae', title: 'digital marketing', location: 'Dubai', limit: 40, datePosted: '7' }
  },
  {
    name: 'indeed_analyst',
    actor: 'valig~indeed-jobs-scraper',
    input: { country: 'ae', title: 'marketing analyst', location: 'Dubai', limit: 20, datePosted: '7' }
  },
  {
    name: 'bayt',
    actor: 'shahidirfan~Bayt-Jobs-Scraper',
    input: { startUrl: 'https://www.bayt.com/en/uae/jobs/digital-marketing-jobs/', results_wanted: 50, max_pages: 8, proxyConfiguration: { useApifyProxy: true } }
  },
  {
    name: 'gulftalent',
    actor: 'solidcode~gulftalent-scraper',
    input: { searchQueries: ['digital marketing manager','performance marketing','media buying','ecommerce manager','CRM manager','social media manager'], country: 'uae', location: 'Dubai', maxResults: 30, includeJobDetails: true }
  },
];

async function runActor({ name, actor, input }){
  console.log(`[${name}] Starting ${actor}...`);
  // Start run synchronously — this waits until the actor finishes and returns the dataset id
  const startUrl = `https://api.apify.com/v2/acts/${actor}/run-sync?token=${TOKEN}&timeout=300`;
  const resp = await fetch(startUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!resp.ok && resp.status !== 201) {
    console.error(`[${name}] FAILED: HTTP ${resp.status}`);
    const text = await resp.text();
    console.error(text.slice(0, 500));
    return { name, items: [], error: `HTTP ${resp.status}` };
  }
  // The run is done. Fetch its dataset.
  const runInfo = await resp.json().catch(() => null);
  const datasetId = runInfo?.data?.defaultDatasetId;
  if (!datasetId) {
    console.error(`[${name}] No dataset returned`);
    return { name, items: [], error: 'no dataset' };
  }
  const dataResp = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&limit=300&token=${TOKEN}`);
  const items = await dataResp.json();
  console.log(`[${name}] Got ${items.length} items`);
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(items));
  return { name, items, count: items.length };
}

(async () => {
  const results = [];
  // Run in parallel for speed
  const promises = ACTORS.map(a => runActor(a).catch(e => {
    console.error(`[${a.name}] Exception:`, e.message);
    return { name: a.name, items: [], error: e.message };
  }));
  const settled = await Promise.all(promises);
  for (const r of settled) results.push({ name: r.name, count: r.items ? r.items.length : 0, error: r.error });
  fs.writeFileSync(path.join(DATA_DIR, '_summary.json'), JSON.stringify(results, null, 2));
  console.log('Scrape summary:', JSON.stringify(results, null, 2));
})();

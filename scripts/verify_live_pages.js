import https from 'https';

const pages = [
  '/',
  '/shillong-teer',
  '/khanapara-teer',
  '/juwai-teer',
  '/previous-results',
  '/dream-numbers',
  '/about',
  '/contact',
  '/privacy-policy',
  '/disclaimer',
  '/terms'
];

function fetchPage(urlPath) {
  return new Promise((resolve, reject) => {
    https.get('https://teerresultlive.in' + urlPath, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path: urlPath, status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log('Testing all 11 live production URLs on https://teerresultlive.in ...\n');
  
  for (const p of pages) {
    try {
      const res = await fetchPage(p);
      const titleMatch = res.html.match(/<title>([^<]+)<\/title>/);
      const descMatch = res.html.match(/<meta name="description" content="([^"]+)"/);
      const canonicalMatch = res.html.match(/<link rel="canonical" href="([^"]+)"/);
      const h1Match = res.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const breadcrumbNav = res.html.includes('aria-label="Breadcrumb"');
      const schemaMatches = [...res.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      
      const schemas = schemaMatches.map(m => {
        try {
          const parsed = JSON.parse(m[1]);
          return parsed['@type'] || 'Object';
        } catch {
          return 'InvalidJSON';
        }
      });

      const title = titleMatch ? titleMatch[1].trim() : 'NONE';
      const desc = descMatch ? descMatch[1].trim() : 'NONE';
      const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ') : 'NONE';
      const canonical = canonicalMatch ? canonicalMatch[1] : 'NONE';

      console.log(`URL: https://teerresultlive.in${p} [HTTP ${res.status}]`);
      console.log(`  Title (${title.length}c): ${title}`);
      console.log(`  Desc  (${desc.length}c): ${desc}`);
      console.log(`  Canonical: ${canonical}`);
      console.log(`  H1: ${h1}`);
      console.log(`  Breadcrumb: ${breadcrumbNav ? 'YES' : (p === '/' ? 'N/A (Home)' : 'MISSING')}`);
      console.log(`  Schemas: [${schemas.join(', ')}]`);
      console.log('');
    } catch (err) {
      console.error(`Failed to fetch ${p}:`, err.message);
    }
  }
}

verifyAll();

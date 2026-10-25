import fs from 'fs';
import path from 'path';

const pagesDir = path.resolve('src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.astro'));

console.log('Auditing', files.length, 'Astro pages for Google SEO:\n');

files.forEach(file => {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  
  // Title
  const titleMatch = content.match(/title=\{?([`"'])(.*?)\1\}?/s);
  const title = titleMatch ? titleMatch[2].replace(/\$\{.*?\}/g, 'DATE') : 'MISSING';
  
  // Description
  const descMatch = content.match(/description=\{?([`"'])(.*?)\1\}?/s);
  const desc = descMatch ? descMatch[2].replace(/\$\{.*?\}/g, 'DATE') : 'MISSING';
  
  // H1
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').replace(/\{.*?\}/g, 'DATE').trim().replace(/\s+/g, ' ') : 'MISSING';
  
  // Multiple H1s check
  const allH1s = [...content.matchAll(/<h1[^>]*>/gi)];

  // client:load check
  const clientLoads = [...content.matchAll(/client:load/g)];

  console.log(`Page: /${file.replace('.astro', '').replace('index', '')}`);
  console.log(`  Title (${title.length} chars): "${title}"`);
  console.log(`  Desc  (${desc.length} chars): "${desc}"`);
  console.log(`  H1    (${allH1s.length} found): "${h1}"`);
  if (clientLoads.length > 0) {
    console.log(`  ⚠️ client:load found: ${clientLoads.length} instance(s)`);
  }
  console.log('');
});

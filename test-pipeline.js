const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

const captured = { rows: [], portals: [] };
function mkEl(id){
  return {
    id, value: '', checked: false, className: '', textContent: '', style: {}, _html: '', children: [],
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = v; },
    firstChild: { textContent: '' },
    addEventListener(){}, focus(){}, classList: { add(){}, remove(){}, contains(){ return false; } },
    appendChild(c){ this.children.push(c); if(this.id === 'portalGrid') captured.portals.push(c._html || ''); },
    querySelector(){ return { textContent: '' }; }
  };
}
const els = new Map();
const document = {
  getElementById(id){ if(!els.has(id)) els.set(id, mkEl(id)); return els.get(id); },
  createElement(){ return mkEl('_new'); },
  createDocumentFragment(){ const f = mkEl('_frag'); f.appendChild = function(c){ this.children.push(c); }; return f; }
};
const ctx = vm.createContext({ document, localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  location: { protocol: 'http:' }, fetch, AbortController, setTimeout, clearTimeout, console });
vm.runInContext(src, ctx);

const jr = document.getElementById('jobResults');
jr.appendChild = frag => { (frag.children || []).forEach(c => captured.rows.push(c._html || '')); };

(async () => {
  const [q, loc, within, remote, resume] = [process.argv[2] || '', process.argv[3] || '', process.argv[4] || '7', process.argv[5] === 'remote', process.argv[6] || ''];
  document.getElementById('roleQuery').value = q;
  document.getElementById('location').value = loc;
  document.getElementById('resume').value = resume;
  document.getElementById('postedWithin').value = within;
  document.getElementById('sortBy').value = process.argv[7] || 'match';
  document.getElementById('remoteOnly').checked = remote;
  document.getElementById('strictMatch').checked = true;
  document.getElementById('useProxy').checked = false;
  document.getElementById('saveResume').checked = false;
  captured.rows = [];

  const t0 = Date.now();
  await ctx.runSearch();
  console.log(`\n== query:"${q}" loc:"${loc}" within:${within}d remote:${remote} resume:${resume ? 'yes' : 'no'}  (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  console.log('TALLY  :', els.get('tally').textContent);
  const mix = {};
  const parsed = captured.rows.map(h => ({
    score: +(h.match(/job-score[^>]*">(\d+)/) || [])[1],
    title: (h.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1],
    source: (h.match(/class="src">([^<]+)/) || [])[1] || '?',
    meta: ((h.match(/class="job-meta">([\s\S]*?)<\/div>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    href: (h.match(/href="([^"]+)"/) || [])[1] || ''
  }));
  parsed.forEach(p => mix[p.source] = (mix[p.source] || 0) + 1);
  console.log('MIX    :', JSON.stringify(mix), '| portals:', captured.portals.length);
  console.log('BAD URL:', parsed.filter(p => !/^https?:\/\//.test(p.href)).length, '| missing title:', parsed.filter(p => !p.title).length);
  parsed.slice(0, 10).forEach(p => console.log(`  ${String(p.score).padStart(2)} | ${p.source.padEnd(10)} | ${(p.title||'').slice(0,58).padEnd(58)} | ${p.meta.split('·').pop().trim()}`));
  if(!parsed.length) console.log('  (empty state)');
})();

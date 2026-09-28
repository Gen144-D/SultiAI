const fs=require('fs');
const r=JSON.parse(fs.readFileSync('_eslint.json','utf8').replace(/^\uFEFF/,''));
const rows=r.filter(f=>f.errorCount>0).map(f=>({p:f.filePath.replace(/.*SultiAI[\\/]/,'').replace(/\\/g,'/'),e:f.errorCount,m:f.messages.filter(x=>x.severity===2).map(x=>`${x.line}:${x.ruleId}`)}));
let t=0; rows.forEach(x=>t+=x.e);
console.log(`files with errors: ${rows.length}, total errors: ${t}`);
rows.filter(x=>/learning|dashboard|components\//.test(x.p)).forEach(x=>{
  const uniq=[...new Set(x.m.map(s=>s.split(':')[1]))];
  console.log(`  ${String(x.e).padStart(3)}  ${x.p}  [${uniq.join(', ')}]`);
});

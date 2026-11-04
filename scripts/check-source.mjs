import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
function walk(dir) { return readdirSync(dir, {withFileTypes:true}).flatMap((item)=>item.isDirectory()?walk(`${dir}/${item.name}`):[`${dir}/${item.name}`]); }
const problems=[];
for (const file of walk('src').filter((name)=>/\.[jt]sx?$/.test(name))) {
  const text=readFileSync(file,'utf8');
  if (/\beval\s*\(|new Function\s*\(|dangerouslySetInnerHTML/.test(text)) problems.push(`${file}: unsafe browser execution`);
  if (/\bconsole\.(log|error|debug)\s*\(/.test(text)) problems.push(`${file}: remove potentially sensitive console logging`);
  if (/VITE_[A-Z_]*(SERVICE|SECRET|PASSWORD)/.test(text)) problems.push(`${file}: forbidden browser secret variable`);
}
for(const file of walk('src').filter(name=>/\.(css|[jt]sx?)$/.test(name))){if(readFileSync(file,'utf8').includes('gradient('))problems.push(`${file}: gradients are forbidden by the visual specification`);}
if (problems.length) throw new Error(problems.join('\n'));
execFileSync(process.execPath,['scripts/generate-types.mjs','--check'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/check-theme.mjs'],{stdio:'inherit'});
console.log('Source safety and schema type checks passed.');

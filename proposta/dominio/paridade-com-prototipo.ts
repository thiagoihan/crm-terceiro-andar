/** Compara as regras em TypeScript com o código original (datas 2024-2030 e detecção de segmento). Rodar: npx tsx proposta/dominio/paridade-com-prototipo.ts */
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import * as R from './regras';
const js=readFileSync(join(__dirname,'../../fonte-original/crm.html'),'utf8');
const pick=(re:RegExp)=>{const m=re.exec(js);if(!m)throw re;return m[0]};
const src=[pick(/function easterOf\(y\)\{[^\n]*\n?/),pick(/function nthSunday[^\n]*/),pick(/function blackFriday[^\n]*/),'const pad=n=>String(n).padStart(2,"0");const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());const addD=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);'].join('\n');
const F=new Function(src+';return {easterOf,nthSunday,blackFriday,ymd,addD}')();
const D=JSON.parse(readFileSync(join(__dirname,'../../referencia/catalogos/datas-comemorativas.json'),'utf8')).datas;
function orig(r:string,y:number){let d:any;if(r.startsWith('M:'))d=new Date(y,+r.slice(2)-1,1);else if(r[0]==='E')d=F.addD(F.easterOf(y),+r.slice(1));else if(r==='MAES')d=F.nthSunday(y,5,2);else if(r==='PAIS')d=F.nthSunday(y,8,2);else if(r==='BF')d=F.blackFriday(y);else if(r==='CM')d=F.addD(F.blackFriday(y),3);else if(r==='D256')d=F.addD(new Date(y,0,1),255);else{const[mm,dd]=r.split('-').map(Number);d=new Date(y,mm-1,dd)}return F.ymd(d)}
let n=0,bad=0;for(const y of [2024,2025,2026,2027,2028,2029,2030])for(const [code,rule,name,cat,kw,tip] of D){n++;const a=orig(rule,y),b=R.resolveDate({code,rule,name,category:cat,keywords:[]} as any,y).date;if(a!==b){bad++;console.log('DIF',y,code,a,b)}}
console.log('datas comparadas',n,'divergências',bad);
// famOf parity
const fam=JSON.parse(readFileSync(join(__dirname,'../../referencia/catalogos/familias-de-segmento.json'),'utf8'));
const famsTS=Object.entries(fam.FAMS).map(([key,f]:any)=>({key,label:f.l,keywords:f.kw,priority:fam.FAM_ORDER.indexOf(key)===-1?99:fam.FAM_ORDER.indexOf(key),authority:[]}));
const origFam=(seg:string,name:string)=>{const hay=' '+(seg+' '+name).toLowerCase()+' ';for(const k of fam.FAM_ORDER)if(fam.FAMS[k].kw.some((w:string)=>hay.includes(w)))return k;return 'geral'};
const samples=['Petiscaria','Açougue','Clínica odontológica','Farmácia de manipulação','Autoescola','Loja de roupas','Academia','Pet shop','Veterinária','Pizzaria','Imobiliária','Escola de idiomas','Contabilidade','Oficina mecânica','Transportadora','Supermercado','Salão de beleza','Oftalmologista','Hortifrúti','Bar e boteco','Despachante','Ótica','Mercearia','Clínica de fisioterapia','Distribuidora de bebidas','Lava-jato','Sapataria','Construtora','Buffet','Hamburgueria'];
let fb=0;for(const s of samples){const a=origFam(s,''),b=R.segmentFamilyOf(s,'',famsTS as any);if(a!==b){fb++;console.log('FAM DIF',s,a,b)}}
console.log('segmentos comparados',samples.length,'divergências',fb);

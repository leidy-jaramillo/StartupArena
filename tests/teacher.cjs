const fs=require('fs'),vm=require('vm'),assert=require('assert');
const template=fs.readFileSync('index.html','utf8');
const cards=Object.fromEntries([['CT',13],['P',10],['IN',10]].map(([key,n])=>[key,Array.from({length:n},(_,i)=>({id:key+(i+1),name:key+(i+1),image:'data:image/png;base64,test'}))]));
const script=template.match(/<script>([\s\S]*?)<\/script>/)[1].replace('/*CARDS*/',JSON.stringify(cards));
const KEY='startup-arena.round.v1',storage=new Map();let now=1790863200000;
function boot(){
 const elements={},timeouts=[],downloads=[],blobs=[],revoked=[];let failWrites=false;
 class El{
 constructor(tag='div'){this.tag=tag;this.value='';this.children=[];this.handlers={};this.attributes={};this.className='';this.disabled=false;this.hidden=false;this.textContent='';this.isConnected=true;this.classList={toggle:(name,on)=>{const s=new Set(this.className.split(' '));on?s.add(name):s.delete(name);this.className=[...s].join(' ');}};}
 append(...items){this.children.push(...items)}prepend(...items){this.children.unshift(...items)}replaceChildren(...items){this.children=items}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){(this.handlers[k]??=[]).push(fn)}focus(){this.focused=true}showModal(){this.open=true}close(){this.open=false}
 querySelectorAll(selector){return this.children.filter(x=>typeof x==='object').flatMap(x=>[...(selector==='input'&&x.tag==='input'||selector.startsWith('.')&&x.className.split(' ').includes(selector.slice(1))?[x]:[]),...x.querySelectorAll(selector)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null}
 click(){downloads.push({href:this.href,filename:this.download})}remove(){this.removed=true}
 fire(type,event={}){for(const fn of this.handlers[type]||[])fn({preventDefault(){},target:this,...event})}
 }
 for(const match of template.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)){const e=new El(match[0].slice(1).split(/[ >]/)[0]);e.value=match[0].match(/value="([^"]*)"/)?.[1]||'';e.className=match[0].match(/class="([^"]*)"/)?.[1]||'';e.hidden=/\shidden(?=[\s>])/.test(match[0]);elements[match[1]]=e;}
 const doc={body:new El('body'),getElementById:id=>elements[id]??=new El(),createElement:tag=>new El(tag),createTextNode:s=>s,addEventListener(){},querySelectorAll:s=>Object.values(elements).flatMap(e=>[...(s.startsWith('.')&&e.className.split(' ').includes(s.slice(1))?[e]:[]),...e.querySelectorAll(s)])};
 const context={Blob,URL:{createObjectURL:b=>{blobs.push(b);return 'blob:test-'+blobs.length},revokeObjectURL:url=>revoked.push(url)},document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failWrites)throw Error('quota');storage.set(k,v)}},crypto:require('crypto').webcrypto,window:{addEventListener(){}},setInterval(){},setTimeout:(fn,delay)=>timeouts.push({fn,at:now+delay}),Date:class extends Date{static now(){return now}},console};
 vm.createContext(context);vm.runInContext(script,context);
 return {elements,downloads,blobs,revoked,run:s=>vm.runInContext(s,context),fail:on=>failWrites=on,submit:(name,total='30',change='15')=>{vm.runInContext("selectTab('arena')",context);elements['group-name'].value=name;elements['total-minutes'].value=total;elements['change-minutes'].value=change;elements['draw-form'].fire('submit');},tick:ms=>{now+=ms;vm.runInContext('processTimers()',context);for(const t of timeouts.splice(0))if(t.at<=now)t.fn();else timeouts.push(t);}};
}
function count(app){return app.run('assignments.length')}
let app=boot();
assert.equal(app.run('CHECKLIST.length'),10);assert.equal(count(app),0);assert.equal(app.run('activeTab'),'activity');
assert.equal(app.elements['panel-activity'].hidden,false);assert.equal(app.elements['panel-arena'].hidden,true);
assert.equal(app.elements['tab-activity'].attributes['aria-selected'],'true');
assert.equal(app.run('TAB_NAMES.length'),4);
app.elements['tab-activity'].fire('keydown',{key:'ArrowLeft'});assert.equal(app.run('activeTab'),'evaluation');
app.elements['tab-evaluation'].fire('keydown',{key:'ArrowRight'});assert.equal(app.run('activeTab'),'activity');
app.elements['tab-activity'].fire('keydown',{key:'End'});assert.equal(app.run('activeTab'),'evaluation');
app.elements['tab-evaluation'].fire('keydown',{key:'Home'});assert.equal(app.run('activeTab'),'activity');
for(const [total,change] of [['',''],['0','1'],['10','10'],['10','11'],['-1','1'],['a','2'],['30','0'],['Infinity','1']]){app.submit('Inválido',total,change);assert.equal(count(app),0);}
app.submit('Equipo Uno','2','1');app.submit('equipo uno','2','1');assert.equal(count(app),1);
const start=app.run('assignments[0].timing.startedAt');assert.equal(start,now);
assert.equal(app.run('assignments[0].timing.endsAt-assignments[0].timing.startedAt'),120000);
assert(app.elements.results.children[0].children[3].children[0].disabled);
app.submit('Equipo Dos','3','0.5');assert.equal(count(app),2);
app.tick(29999);assert.equal(app.run('assignments.some(a=>a.investorChange)'),false);
app.tick(1);assert.equal(app.run('!!assignments[1].investorChange'),true);assert.equal(app.run('!!assignments[0].investorChange'),false);
const secondChange=app.run('JSON.stringify(assignments[1].investorChange)');
app=boot();assert.equal(app.run('assignments[0].timing.startedAt'),start);assert.equal(app.run('JSON.stringify(assignments[1].investorChange)'),secondChange);
app.tick(30000);assert(app.run('assignments.every(a=>a.investorChange)'));
assert.equal(app.run('activeTab'),'arena');
app.tick(60000);assert.equal(app.run('assignments[0].timeExpired'),true);assert.equal(app.run('activeTab'),'arena');
assert.equal(app.run('assignments[0].solutionDelivered'),undefined);
app.tick(60000);assert.equal(app.run('activeTab'),'evaluation');assert.equal(app.elements['evaluation-results'].children.length,2);
assert.equal(app.elements['panel-arena'].hidden,true);assert.equal(app.elements['panel-evaluation'].hidden,false);
let firstEval=app.elements['evaluation-results'].children[0];let boxes=firstEval.querySelectorAll('input');assert.equal(boxes.length,20);
assert(boxes.every(b=>b.type==='radio'&&!b.checked));assert.equal(boxes[0].name,boxes[1].name);assert.notEqual(boxes[0].name,boxes[2].name);
assert.notEqual(boxes[0].name,app.elements['evaluation-results'].children[1].querySelectorAll('input')[0].name);
boxes[0].checked=true;boxes[0].fire('change');boxes[8].checked=true;boxes[8].fire('change');
assert.equal(app.run('assignments[0].evaluation.filter(Boolean).length'),2);assert.equal(app.run('assignments[1].evaluation'),undefined);
assert.equal(firstEval.children[3].children[1].value,2);
boxes[1].checked=true;boxes[1].fire('change');assert.equal(firstEval.children[3].children[1].value,1);assert.equal(boxes[0].checked,false);assert.equal(app.run('assignments[0].evaluation[0]'),false);
app.fail(true);boxes[2].checked=true;boxes[2].fire('change');assert.equal(boxes[2].checked,false);assert.equal(app.run('assignments[0].evaluation[1]'),null);app.fail(false);
app=boot();assert.equal(app.run('activeTab'),'evaluation');assert.equal(app.run('assignments[0].evaluation[4]'),true);
assert.equal(app.run('assignments[0].evaluation[0]'),false);assert.equal(app.run('evaluationPercent(assignments[0])'),10);
assert.equal(app.elements['evaluation-results'].children[0].querySelectorAll('input')[1].checked,true);
app.run("selectTab('guide')");app.tick(1000);assert.equal(app.run('activeTab'),'guide');
app.elements['tab-guide'].fire('keydown',{key:'ArrowRight'});assert.equal(app.run('activeTab'),'evaluation');
app.elements['tab-evaluation'].fire('keydown',{key:'Home'});assert.equal(app.run('activeTab'),'activity');
app.submit('Equipo Tres','1','0.5');assert.equal(app.elements['evaluation-results'].children.length,0);app.tick(60000);assert.equal(app.run('activeTab'),'evaluation');
assert.equal(app.run('assignments[0].evaluation[4]'),true);
app.elements['confirm-reset'].fire('click');assert.equal(count(app),0);assert.equal(app.elements['evaluation-results'].children.length,0);app.tick(100000);assert.equal(count(app),0);
app=boot();assert.equal(count(app),0);
console.log('PASS: tiempos inválidos, duplicados, inicio, plazos independientes, cambio automático, recarga, cierre de todos, evaluación 0–100 %, correcciones, fallo de guardado, navegación accesible y reinicio.');
// Existing rounds retain their cards and progress; timing is opt-in for their migration.
storage.set(KEY,JSON.stringify({version:1,assignments:[{name:'Anterior',CT:'CT1',P:'P1',IN:'IN1',solutionImage:'data:image/jpeg;base64,test',solutionDelivered:true,investorChange:{title:'Existente',condition:'Condición',question:'Pregunta'},changeToken:'old'}]}));
app=boot();const legacy=app.elements.results.children[0].children[0].children[2];assert.equal(legacy.className,'legacy-timing');legacy.fire('submit');
assert.equal(app.run('assignments[0].CT'),'CT1');assert.equal(app.run('assignments[0].investorChange.title'),'Existente');assert.equal(app.run('assignments[0].solutionDelivered'),true);assert(app.run('timingValid(assignments[0].timing)'));
const end=app.run('assignments[0].timing.endsAt');now=end+1000;app=boot();assert.equal(app.run('activeTab'),'evaluation');assert.equal(app.run('assignments[0].investorChange.title'),'Existente');
app.elements['confirm-reset'].fire('click');app.submit('Suspendido','5','2');now+=600000;app=boot();assert(app.run('assignments[0].investorChange'));assert.equal(app.run('assignments[0].timeExpired'),true);assert.equal(app.run('activeTab'),'evaluation');
app.elements['confirm-reset'].fire('click');app.submit('Fallo evento','1','0.5');app.fail(true);app.tick(60000);assert.equal(app.run('assignments[0].investorChange'),undefined);assert.equal(app.run('activeTab'),'arena'); // Failed events must not open evaluation.
assert.equal(app.elements['evaluation-results'].children.length,0);app.fail(false);app.tick(1000);assert.equal(app.run('assignments[0].timeExpired'),true);
console.log('PASS: migración sin alterar tarjetas o entregas, suspensión/cierre, evento fallido sin perder datos y reintento.');
assert.equal(app.run('JSON.stringify(checklistValues({evaluation:[true,false]}))'),'[true,null,null,null,null,null,null,null,null,null]');
assert.equal(app.run("JSON.stringify(checklistValues({evaluation:[true,false],evaluationFormat:'yes-no-v1'}))"),'[true,false,null,null,null,null,null,null,null,null]');
assert.equal(app.run("evaluationPercent({evaluation:Array(10).fill(false),evaluationFormat:'yes-no-v1'})"),0);
assert.equal(app.run('evaluationPercent({evaluation:Array(10).fill(true)})'),100);
const csv=app.run(`evaluationCSV([{name:'Diseño; "Ágil"',evaluation:[true,true,false],evaluationFormat:'yes-no-v1'},{name:'=1+1',evaluation:Array(10).fill(false),evaluationFormat:'yes-no-v1'}])`);
assert.equal(csv,'\uFEFF"Equipo";"Porcentaje logrado"\r\n"Diseño; ""Ágil""";"20%"\r\n"\'=1+1";"0%"\r\n');
assert.equal(app.elements['evaluation-export'].hidden,false);
assert.equal(app.elements['download-evaluation'].disabled,true);
app.elements['download-evaluation'].fire('click');assert.equal(app.downloads.length,0);
app.submit('Otro equipo','1','0.5');app.tick(60000);
assert.equal(app.run('pendingEvaluationItems()'),20);
let reviews=app.elements['evaluation-results'].children;
let options=reviews[0].querySelectorAll('input');
for(let i=0;i<10;i++){const option=options[i*2+(i===0?0:1)];option.checked=true;option.fire('change');}
assert.equal(app.run('pendingEvaluationItems()'),10);assert.equal(app.elements['download-evaluation'].disabled,true);
options=reviews[1].querySelectorAll('input');
for(let i=0;i<9;i++){options[i*2+1].checked=true;options[i*2+1].fire('change');}
assert.equal(app.run('pendingEvaluationItems()'),1);assert.equal(app.elements['download-evaluation'].disabled,true);
app.elements['download-evaluation'].fire('click');assert.equal(app.downloads.length,0);
app.fail(true);options[19].checked=true;options[19].fire('change');
assert.equal(app.run('pendingEvaluationItems()'),1);assert.equal(app.elements['download-evaluation'].disabled,true);
app.fail(false);options[19].checked=true;options[19].fire('change');
assert.equal(app.run('pendingEvaluationItems()'),0);assert.equal(app.elements['download-evaluation'].disabled,false);
assert.equal(app.run('evaluationPercent(assignments[1])'),0); // All No answers are a complete review.
app=boot();assert.equal(app.elements['download-evaluation'].disabled,false);
app.elements['download-evaluation'].fire('click');assert.equal(app.downloads.length,1);assert.equal(app.downloads[0].filename,'Startup-Arena-evaluacion.csv');
const downloadedBlob=app.blobs[0],expectedCSV=app.run('evaluationCSV(assignments)');
assert.equal(downloadedBlob.type,'text/csv;charset=utf-8;');
downloadedBlob.arrayBuffer().then(bytes=>{assert.equal(Buffer.from(bytes).toString('utf8'),expectedCSV);console.log('PASS: contenido CSV descargado coincide con equipos y porcentajes actuales, con BOM y caracteres acentuados.');});
app.tick(1000);assert.equal(app.revoked.length,1);
// Revalidate saved state at click time, even if another tab has left an item pending.
app.run('assignments[0].evaluation[0]=null;persist(assignments)');
app.elements['download-evaluation'].fire('click');assert.equal(app.downloads.length,1);assert.equal(app.elements['download-evaluation'].disabled,true);
app.elements['confirm-reset'].fire('click');assert.equal(app.elements['evaluation-export'].hidden,true);app.elements['download-evaluation'].fire('click');assert.equal(app.downloads.length,1);
console.log('PASS: Sí/No exclusivos, persistencia y migración, 0–100 %, CSV, descarga bloqueada con pendientes de cualquier equipo, fallo de guardado, habilitación con todos los No, recarga, revalidación y reinicio.');
// Podium rankings use distinct score bands and keep all tied teams.
const rankedFixture=(scores)=>scores.map((score,i)=>({name:'Equipo '+(i+1),CT:'CT'+(i+1),P:'P'+(i+1),IN:'IN'+(i+1),assignmentId:'podium-'+i,timing:{startedAt:now-120000,changeAt:now-90000,endsAt:now-60000,totalMinutes:1,changeMinutes:0.5},timeExpired:true,investorChange:{title:'Cambio',condition:'Condición',question:'Pregunta'},changeToken:'change-'+i,evaluationFormat:'yes-no-v1',evaluation:Array.from({length:10},(_,n)=>n<score/10)}));
assert.equal(app.elements['show-podium'].disabled,true);app.elements['show-podium'].fire('click');assert(!app.elements['podium-dialog'].open);
storage.set(KEY,JSON.stringify({version:1,assignments:rankedFixture([90,100,100,80,70])}));
app=boot();assert.equal(app.elements['show-podium'].disabled,false);
assert.equal(app.run('JSON.stringify(podiumRanking(assignments))'),JSON.stringify([{rank:1,score:100,teams:['Equipo 2','Equipo 3']},{rank:2,score:90,teams:['Equipo 1']},{rank:3,score:80,teams:['Equipo 4']}]));
const savedBeforePodium=storage.get(KEY);
app.elements['show-podium'].fire('click');assert.equal(app.elements['podium-dialog'].open,true);
assert.equal(app.elements['podium-slide-1'].hidden,false);assert.equal(app.elements['podium-slide-2'].hidden,true);assert.equal(app.elements['podium-tie-1'].hidden,false);assert.equal(app.elements['podium-teams-1'].children.length,2);
assert.equal(app.elements['podium-score-1'].textContent,'100 % logrado');
app.elements['podium-next'].fire('click');assert.equal(app.run('podiumIndex'),1);assert.equal(app.elements['podium-slide-2'].hidden,false);
app.elements['podium-dialog'].fire('keydown',{key:'End'});assert.equal(app.run('podiumIndex'),2);
app.elements['podium-next'].fire('click');assert.equal(app.run('podiumIndex'),0);
app.elements['podium-prev'].fire('click');assert.equal(app.run('podiumIndex'),2);
app.elements['podium-go-2'].fire('click');assert.equal(app.run('podiumIndex'),1);
app.elements['podium-dialog'].fire('keydown',{key:'ArrowLeft'});assert.equal(app.run('podiumIndex'),0);
app.elements['close-podium'].fire('click');assert.equal(app.elements['podium-dialog'].open,false);
assert.equal(storage.get(KEY),savedBeforePodium);
// New ranking reflects updated, already saved scores; no stored or random winner.
app.run('assignments[0].evaluation=Array(10).fill(true);persist(assignments)');
app.elements['show-podium'].fire('click');assert.equal(app.elements['podium-teams-1'].children.length,3);
assert.equal(app.elements['podium-score-2'].textContent,'80 % logrado');
app.run('assignments[0].evaluation[0]=null;persist(assignments);render()');assert.equal(app.elements['podium-dialog'].open,false);assert.equal(app.elements['show-podium'].disabled,true);
app.elements['show-podium'].fire('click');assert.equal(app.elements['podium-dialog'].open,false);
storage.set(KEY,JSON.stringify({version:1,assignments:rankedFixture([50,50])}));app=boot();app.elements['show-podium'].fire('click');assert.equal(app.run('podiumGroups.length'),1);assert.equal(app.elements['podium-teams-1'].children.length,2);assert.equal(app.elements['podium-prev'].disabled,true);assert.equal(app.elements['podium-next'].disabled,true);assert.equal(app.elements['podium-go-2'].hidden,true);assert.equal(app.elements['podium-slide-3'].hidden,true);
storage.set(KEY,JSON.stringify({version:1,assignments:rankedFixture([0])}));app=boot();app.elements['show-podium'].fire('click');assert.equal(app.elements['podium-score-1'].textContent,'0 % logrado');assert.equal(app.elements['podium-teams-1'].children.length,1);
app.elements['confirm-reset'].fire('click');assert.equal(app.elements['podium-dialog'].open,false);assert.equal(app.elements['show-podium'].disabled,true);
console.log('PASS: Podium con empate en primer lugar, tres porcentajes más altos, exclusión del cuarto, carrusel y teclado, actualización de resultados, bloqueo con pendientes, un solo puesto, 0 %, cierre y reinicio sin alterar evaluaciones.');
app=boot();
const activityDescriptionIds=['activity-reading-intro','activity-reading-arena','activity-reading-teams','activity-reading-pitch'];
assert(activityDescriptionIds.every(id=>app.elements[id].hidden));
app.elements['reading-view'].checked=true;app.elements['reading-view'].fire('change');
assert(activityDescriptionIds.every(id=>!app.elements[id].hidden));
app.run("selectTab('arena');selectTab('activity')");
assert(activityDescriptionIds.every(id=>!app.elements[id].hidden));
app.submit('Lectura accesible','30','15');
assert.equal(app.elements.results.children[0].children[1].children[0].children[2].hidden,false);
const readingAssignments=app.run('JSON.stringify(assignments)');
app.elements['reading-view'].checked=false;app.elements['reading-view'].fire('change');
assert(activityDescriptionIds.every(id=>app.elements[id].hidden));
assert.equal(app.elements.results.children[0].children[1].children[0].children[2].hidden,true);
assert.equal(app.run('JSON.stringify(assignments)'),readingAssignments);
console.log('PASS: Vista de lectura muestra y oculta las cuatro descripciones de La actividad, conserva el estado entre pestañas y mantiene las transcripciones y asignaciones existentes.');

const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const test of ['core.cjs','teacher.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,test)],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}

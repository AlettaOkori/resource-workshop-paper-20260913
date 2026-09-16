const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('/Users/alettaokori/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const records=JSON.parse(fs.readFileSync(path.join(root,'paper-theme/resources/catalog.json')));
 const selected=process.argv.slice(2);
 const artifacts=[...new Set(records.filter(r=>!r.legacy&&r.artifact&&(!selected.length||selected.includes(r.artifact))).map(r=>r.artifact))];
 if(selected.some(artifact=>!artifacts.includes(artifact)))throw new Error('预览资源不在目录中');
 const dir=path.join(root,'paper-theme/previews');fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1200,height:750},deviceScaleFactor:1});
 const manifestFile=path.join(dir,'manifest.json');
 const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{};
 for(const artifact of artifacts){
  const page=await context.newPage();const response=await page.goto('http://127.0.0.1:4314'+artifact,{waitUntil:'networkidle'});
  if(!response?.ok())throw new Error('无法加载 '+artifact);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(artifact.includes('activity-mgmt')?3600:900);
  const name=artifact.replace(/^\/artifacts\//,'').replace(/\.(html?)$/,'').replaceAll('/','-')+'.jpg';
  await page.screenshot({path:path.join(dir,name),type:'jpeg',quality:88,animations:'disabled'});
  manifest[artifact]='/paper-theme/previews/'+name;
  if(artifact.startsWith('/artifacts/papers/')){
   // Capture a readable portrait excerpt from the real paper, without the page surround.
   await page.setViewportSize({width:560,height:1500});
   const sheet=await page.locator('.sheet').boundingBox();
   if(!sheet)throw new Error('未找到试卷正文 '+artifact);
   const sheetName=name.replace(/\.jpg$/,'-sheet.jpg');
   await page.screenshot({path:path.join(dir,sheetName),type:'jpeg',quality:94,animations:'disabled',clip:{x:sheet.x,y:sheet.y,width:sheet.width,height:Math.min(sheet.height,Math.floor(sheet.width*2.1))}});
   manifest[artifact+'#sheet']='/paper-theme/previews/'+sheetName;
  }
  console.log(artifact);await page.close();
 }
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const {spawn} = require('node:child_process');
const {gunzipSync} = require('node:zlib');
let ready;
async function boot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'workshop-'));
  const candidates=[path.join(__dirname,'runtime.bundle.gz'),path.join(process.cwd(),'functions/runtime.bundle.gz'),path.join(process.cwd(),'hosting/functions/runtime.bundle.gz')];
  const archive=candidates.find(p=>fs.existsSync(p));
  if(!archive) throw new Error('Standalone runtime archive missing');
  const entries=JSON.parse(gunzipSync(fs.readFileSync(archive)).toString('utf8'));
  for(const entry of entries) {
    const file=path.resolve(root,entry.path);
    if(!file.startsWith(root+path.sep)) throw new Error('Invalid runtime path');
    fs.mkdirSync(path.dirname(file),{recursive:true});
    if(entry.link) fs.symlinkSync(entry.link,file);
    else fs.writeFileSync(file,Buffer.from(entry.data,'base64'),{mode:entry.mode});
  }
  const probe=net.createServer();
  await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,[path.join(root,'server.js')],{cwd:root,env:{...process.env,PORT:String(port),HOSTNAME:'127.0.0.1',NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
  child.stderr.on('data',data=>console.error(String(data)));
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(new Error('Runtime startup timed out'));},20000);
    child.stdout.on('data',data=>{if(String(data).includes('Ready')){clearTimeout(timer);resolve();}});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);ready=undefined;reject(new Error('Runtime exited '+code));});
  });
  return port;
}
exports.handler=async(event,context)=>{
  context.callbackWaitsForEmptyEventLoop=false;
  try {
    const port=await(ready ||= boot().catch(error=>{ready=undefined;throw error;}));
    const incoming=new URL(event.rawUrl || ('https://workshop.invalid'+event.path));
    const headers={...event.headers,'accept-encoding':'identity'};
    delete headers.connection; delete headers['content-length'];
    const response=await new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port,method:event.httpMethod,path:incoming.pathname+incoming.search,headers},res=>{
        const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({statusCode:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));res.on('error',reject);
      });
      req.on('error',reject);
      if(event.body) req.write(Buffer.from(event.body,event.isBase64Encoded?'base64':'utf8'));
      req.end();
    });
    const outputHeaders={...response.headers};
    for(const key of ['connection','keep-alive','transfer-encoding','content-length','etag']) delete outputHeaders[key];
    let body=response.body;
    if(/text\/html/i.test(outputHeaders['content-type']||'')&&!incoming.pathname.startsWith('/artifacts/')) {
      const gate='<script>(function(){var push=history.pushState.bind(history),replace=history.replaceState.bind(history);function hold(value){try{var u=new URL(value,location.href),p=u.searchParams,id=p.get("chatId"),prompt=p.get("q"),saved=JSON.parse(sessionStorage.getItem("resource-workshop.creation.v2:"+id)||"{}");if(u.pathname!="/chat"||!id||id.indexOf("sim-")!==0||!prompt||saved.phase==="generating"||saved.phase==="complete")return null;sessionStorage.setItem("resource-workshop.prompt.v2:"+id,JSON.stringify({prompt:prompt,createdAt:Date.now(),featureId:p.get("featureId")||"",feature:p.get("feat")||""}));p.delete("q");return u.pathname+"?"+p.toString()+u.hash}catch(e){return null}}var initial=hold(location.href);if(initial)replace(history.state,"",initial);history.pushState=function(state,title,url){var held=url&&hold(url);if(held){location.assign(held);return}return push(state,title,url)}})();</script>';
      body=Buffer.from(body.toString('utf8').replace('<head>','<head>'+gate).replace('</head>','<link rel="stylesheet" href="/paper-theme/paper.css"><script defer src="/paper-theme/presentation.js"></script></head>'));
      outputHeaders['cache-control']='no-store';
    }
    const multiValueHeaders={};
    for(const [key,value] of Object.entries(outputHeaders)) {multiValueHeaders[key]=Array.isArray(value)?value:[String(value)];}
    return {statusCode:response.statusCode,multiValueHeaders,body:body.toString('base64'),isBase64Encoded:true};
  } catch(error) {console.error(error);return {statusCode:502,body:'Application temporarily unavailable'};}
};

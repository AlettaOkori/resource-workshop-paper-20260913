const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const net = require('node:net');
const {spawn,execFileSync} = require('node:child_process');
let ready;
async function boot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'workshop-'));
  const candidates=[path.join(__dirname,'runtime.tar.gz'),path.join(process.cwd(),'functions/runtime.tar.gz'),path.join(process.cwd(),'hosting/functions/runtime.tar.gz')];
  const archive=candidates.find(p=>fs.existsSync(p));
  if(!archive) throw new Error('Standalone runtime archive missing');
  execFileSync('tar',['-xzf',archive,'-C',root]);
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
      body=Buffer.from(body.toString('utf8').replace('</head>','<link rel="stylesheet" href="/paper-theme/paper.css"><script defer src="/paper-theme/presentation.js"></script></head>'));
      outputHeaders['cache-control']='no-store';
    }
    const multiValueHeaders={};
    for(const [key,value] of Object.entries(outputHeaders)) {multiValueHeaders[key]=Array.isArray(value)?value:[String(value)];}
    return {statusCode:response.statusCode,multiValueHeaders,body:body.toString('base64'),isBase64Encoded:true};
  } catch(error) {console.error(error);return {statusCode:502,body:'Application temporarily unavailable'};}
};

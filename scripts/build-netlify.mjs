import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'hosting/dist');
fs.rmSync(dist, {recursive:true, force:true});
fs.mkdirSync(dist, {recursive:true});
fs.cpSync(path.join(root,'public'),dist,{recursive:true});
fs.cpSync(path.join(root,'.next/static'),path.join(dist,'_next/static'),{recursive:true});
fs.cpSync(path.join(root,'paper-theme'),path.join(dist,'paper-theme'),{recursive:true});
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'workshop-build-'));
try {
  execFileSync('tar',['-xzf',path.join(root,'runtime/node-modules.tar.gz'),'-C',tmp]);
  fs.cpSync(path.join(root,'.next'),path.join(tmp,'.next'),{recursive:true,filter: p=>!p.includes('/cache/')});
  fs.copyFileSync(path.join(root,'server.js'),path.join(tmp,'server.js'));
  fs.writeFileSync(path.join(tmp,'package.json'),JSON.stringify({name:'workshop-runtime',private:true}));
  // Preview credentials are build-local and never reused from the original snapshot.
  const manifestPath=path.join(tmp,'.next/prerender-manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.preview={previewModeId:randomBytes(16).toString('hex'),previewModeSigningKey:randomBytes(32).toString('hex'),previewModeEncryptionKey:randomBytes(32).toString('hex')};
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));
  const entries=[];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const file=path.join(dir,name), stat=fs.lstatSync(file), relative=path.relative(tmp,file);
      if(stat.isDirectory()) walk(file);
      else if(stat.isSymbolicLink()) entries.push({path:relative,link:fs.readlinkSync(file)});
      else entries.push({path:relative,data:fs.readFileSync(file).toString('base64'),mode:stat.mode & 0o777});
    }
  }
  walk(tmp);
  fs.writeFileSync(path.join(root,'hosting/functions/runtime.bundle.gz'),gzipSync(JSON.stringify(entries)));
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
console.log('Netlify assets and standalone runtime ready.');

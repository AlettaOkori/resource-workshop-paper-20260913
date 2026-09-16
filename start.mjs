import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// The copied application remains the functional source of truth.
// This server adds only the independently maintained paper presentation assets.
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const publicPort = Number(process.env.PORT || 4314);
const publicHost = process.env.PAPER_HOST || '127.0.0.1';
const portProbe = net.createServer();
await new Promise((resolve, reject) => { portProbe.once('error', reject); portProbe.listen(0, '127.0.0.1', resolve); });
const appPort = portProbe.address().port;
await new Promise(resolve => portProbe.close(resolve));
const child = spawn(process.execPath, [path.join(projectDir, 'server.js')], {
  cwd: projectDir,
  env: { ...process.env, PORT: String(appPort), HOSTNAME: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stderr.on('data', chunk => process.stderr.write(chunk));
let childReady = false;
const startupTimeout = setTimeout(() => { if (!childReady) { console.error('原应用启动超时。'); child.kill(); process.exitCode = 1; } }, 20000);
await new Promise((resolve, reject) => {
  child.stdout.on('data', chunk => {
    if (/Ready/.test(String(chunk)) && !childReady) { childReady = true; clearTimeout(startupTimeout); resolve(); }
  });
  child.once('error', reject);
  child.once('exit', code => { if (!childReady) reject(new Error('原应用无法启动，退出码 ' + code)); });
});
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
// Hold the initial prompt before the bundled chat app mounts. The original app
// starts simulated work as soon as it sees `q` in the URL; the paper layer needs
// the teacher to finish the lightweight setup cards first. Removing only `q`
// keeps the route and feature selection intact while allowing the layer to
// submit the prompt after knowledge and settings are confirmed.
const gate = `<script>(function(){var push=history.pushState.bind(history),replace=history.replaceState.bind(history);function hold(value){try{var u=new URL(value,location.href),p=u.searchParams,id=p.get('chatId'),prompt=p.get('q'),saved=JSON.parse(sessionStorage.getItem('resource-workshop.creation.v2:'+id)||'{}');if(u.pathname!='/chat'||!id||id.indexOf('sim-')!==0||!prompt||saved.phase==='generating'||saved.phase==='complete')return null;sessionStorage.setItem('resource-workshop.prompt.v2:'+id,JSON.stringify({prompt:prompt,createdAt:Date.now(),featureId:p.get('featureId')||'',feature:p.get('feat')||''}));p.delete('q');return u.pathname+'?'+p.toString()+u.hash}catch(e){return null}}var initial=hold(location.href);if(initial)replace(history.state,'',initial);history.pushState=function(state,title,url){var held=url&&hold(url);if(held){location.assign(held);return}return push(state,title,url)}})();</script>`;
const inject = '<link rel="stylesheet" href="/paper-theme/paper.css"><script defer src="/paper-theme/presentation.js"></script>';
const frontend = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (pathname.startsWith('/paper-theme/')) {
    const filePath = path.resolve(projectDir, '.' + pathname);
    const themeRoot = path.join(projectDir, 'paper-theme') + path.sep;
    if (!filePath.startsWith(themeRoot)) { res.writeHead(403); res.end(); return; }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream', 'content-length': stat.size, 'cache-control': 'no-cache' });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(filePath).pipe(res);
    });
    return;
  }
  // Preserve route, method, request body, cookies, and public Host exactly.
  const upstream = http.request({ hostname: '127.0.0.1', port: appPort, method: req.method, path: req.url, headers: { ...req.headers, 'accept-encoding': 'identity' } }, response => {
    const headers = { ...response.headers };
    const isHTML = !pathname.startsWith('/artifacts/') && /text\/html/i.test(String(headers['content-type'])) && !headers['content-encoding'] && req.method !== 'HEAD' && response.statusCode !== 304;
    if (!isHTML) { res.writeHead(response.statusCode, headers); response.pipe(res); return; }
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      let html = Buffer.concat(chunks).toString('utf8');
      html = html.includes('</head>') ? html.replace('<head>', '<head>' + gate).replace('</head>', inject + '</head>') : html;
      const body = Buffer.from(html);
      delete headers['transfer-encoding']; delete headers.etag;
      headers['content-length'] = body.length; headers['cache-control'] = 'no-store';
      res.writeHead(response.statusCode, headers); res.end(body);
    });
    response.on('error', () => res.destroy());
  });
  upstream.on('error', error => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); res.end('应用暂时不可用：' + error.message); });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});
frontend.on('error', error => { console.error(error.message); child.kill(); process.exitCode = 1; });
frontend.listen(publicPort, publicHost, () => console.log(`资源工坊 · 纸面编排\nhttp://${publicHost}:${publicPort}\n按 Ctrl+C 停止。`));
let stopping = false;
function stop() { if (stopping) return; stopping = true; frontend.close(); frontend.closeAllConnections(); child.kill('SIGTERM'); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
child.on('exit', code => { if (!stopping) { console.error('原应用进程退出：' + code); frontend.close(); process.exitCode = code || 1; } });

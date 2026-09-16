/* Create standalone HTML exports without changing the original artifacts. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..'), publicRoot = path.join(root,'public');
const Babel = require(path.join(publicRoot,'artifacts/vendor/babel.min.js'));
const output = path.join(root,'paper-theme/downloads');
fs.mkdirSync(output,{recursive:true});
const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.mp4':'video/mp4','.woff':'font/woff','.woff2':'font/woff2','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript'};
const dataCache = new Map(), externalFonts = new Map();
const safeScript = s => s.replace(/<\/script/gi,'<\\/script');
function local(value,base) {
  if (/^(?:data:|blob:|#|https?:|\/\/)/.test(value)) return null;
  const target = value.startsWith('/') ? path.join(publicRoot,value) : path.resolve(path.dirname(base),value);
  if (!target.startsWith(publicRoot + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error(`Missing local dependency ${value} from ${base}`);
  return target;
}
function dataURI(filename) {
  if (!dataCache.has(filename)) dataCache.set(filename,`data:${mime[path.extname(filename)] || 'application/octet-stream'};base64,${fs.readFileSync(filename).toString('base64')}`);
  return dataCache.get(filename);
}
function rewriteAssets(source,base) {
  return source.replace(/(["'])((?:\.\.?\/|\/artifacts\/)[^"'\s]+\.(?:png|jpe?g|svg|mp[34]|woff2?))(?:\?[^"']*)?\1/gi,(_,quote,value) => quote + dataURI(local(value,base)) + quote);
}
async function css(source,base) {
  const matches = [...source.matchAll(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g)];
  for (const match of matches) {
    const value = match[2]; let uri;
    if (/^https?:.*\.woff2?(?:\?|$)/i.test(value)) {
      if (!externalFonts.has(value)) {
        const response = await fetch(value);if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
        externalFonts.set(value,`data:font/woff;base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`);
      }
      uri = externalFonts.get(value);
    } else {const file = local(value,base); if (file) uri = dataURI(file);}
    if (uri) source = source.replaceAll(match[0],`url("${uri}")`);
  }
  return source;
}
function bundle(entry,imports) {
  const modules = new Map();
  function visit(file) {
    const key = path.relative(publicRoot,file).replaceAll(path.sep,'/');if (modules.has(key)) return key;
    modules.set(key,'');
    let source = rewriteAssets(fs.readFileSync(file,'utf8'),file).replace(/import\.meta\.hot/g,'false');
    let transformed = Babel.transform(source,{presets:['react'],plugins:['transform-modules-commonjs'],sourceType:'module',filename:file,compact:true,comments:false}).code;
    const dependencies = {};
    for (const match of transformed.matchAll(/\brequire\(["']([^"']+)["']\)/g)) {
      const ref = match[1];if (dependencies[ref]) continue;
      const target = imports[ref] ? local(imports[ref],entry) : local(ref,file);
      if (!target) throw new Error(`Unsupported module: ${ref}`);
      dependencies[ref] = visit(target);
    }
    modules.set(key,`[function(module,exports,require){${transformed}\n},${JSON.stringify(dependencies)}]`);
    return key;
  }
  const entryKey = visit(entry);
  return `(function(){const modules={${[...modules].map(([id,code]) => JSON.stringify(id)+':'+code).join(',')}};const cache={};function load(id){if(cache[id])return cache[id].exports;const mod=cache[id]={exports:{}};const [run,map]=modules[id];run(mod,mod.exports,name=>load(map[name]));return mod.exports;}load(${JSON.stringify(entryKey)});})();`;
}
async function exportHTML(artifact) {
  const file = path.join(publicRoot,artifact);let html = fs.readFileSync(file,'utf8');
  const mapMatch = html.match(/<script\b[^>]*type=["']importmap-shim["'][^>]*>([\s\S]*?)<\/script>/i);
  const imports = mapMatch ? JSON.parse(mapMatch[1]).imports : {};
  if (mapMatch) {
    html = html.replace(mapMatch[0],'').replace(/<script\b[^>]*>\s*window\.esmsInitOptions\s*=[\s\S]*?<\/script>/i,'');
    html = html.replace(/<script\b[^>]*src=["'][^"']*(?:babel\.min|es-module-shims)\.js["'][^>]*>\s*<\/script>/gi,'');
  }
  const scripts = [...html.matchAll(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi)];
  for (const match of scripts) {
    const scriptFile = local(match[2],file);if (!scriptFile) throw new Error('External script cannot be exported: '+match[2]);
    const module = /type=["']module(?:-shim)?["']/.test(match[1]+match[3]);
    const source = module ? bundle(scriptFile,imports) : fs.readFileSync(scriptFile,'utf8');
    html = html.replace(match[0],() => `<script>${safeScript(source)}</script>`);
  }
  for (const match of [...html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]) {
    const fileRef = local(match[1],file);if (!fileRef) continue;
    const replacement = /rel=["']stylesheet/.test(match[0]) ? `<style>${await css(fs.readFileSync(fileRef,'utf8'),fileRef)}</style>` : match[0].replace(match[1],dataURI(fileRef));
    html = html.replace(match[0],() => replacement);
  }
  for (const match of [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]) {const replacement = `<style>${await css(match[1],file)}</style>`;html = html.replace(match[0],() => replacement);}
  html = rewriteAssets(html,file).replace(/<base\b[^>]*>/gi,'').replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,'');
  const filename = artifact.replace(/^\/artifacts\//,'').replace(/\/index\.html$/,'').replace(/\.html$/,'').replaceAll('/','-')+'.html';
  fs.writeFileSync(path.join(output,filename),html);
  return {href:'/paper-theme/downloads/'+filename,bytes:Buffer.byteLength(html)};
}
(async () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root,'paper-theme/resources/catalog.json'),'utf8'));
  const selected = process.argv.slice(2);
  const artifacts = [...new Set(catalog.map(r => r.artifact).filter(Boolean))];
  if(selected.some(artifact=>!artifacts.includes(artifact)))throw new Error('导出资源不在目录中');
  const manifestFile = path.join(output,'manifest.json');
  const reportFile = path.join(root,'verification/meeting-20260914/download-build.json');
  const manifest = selected.length&&fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{};
  const results = selected.length&&fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile)).filter(item=>!selected.includes(item.artifact)):[];
  for (const artifact of artifacts.filter(artifact=>!selected.length||selected.includes(artifact))) {
    const item = await exportHTML(artifact);manifest[artifact] = item.href;results.push({artifact,...item});
    process.stdout.write(`${artifact}: ${item.bytes} bytes\n`);
  }
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(reportFile,JSON.stringify(results,null,2)+'\n');
})().catch(error => {console.error(error);process.exitCode=1;});

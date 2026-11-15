// src/game.html -> www/index.html (글꼴을 앱 안에 넣고, 기기 연결 스크립트를 붙입니다)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const www = path.join(root, 'www');
fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });

// 1) 글꼴: Google Fonts 링크 대신 앱 안의 파일을 씁니다 (오프라인에서도 같은 글꼴).
const fonts = [['jua', ['400.css']], ['gaegu', ['400.css', '700.css']]];
const links = [];
for (const [name, cssFiles] of fonts) {
  const src = path.join(root, 'node_modules', '@fontsource', name);
  const dst = path.join(www, 'fonts', name);
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(path.join(src, 'files'), path.join(dst, 'files'), { recursive: true, filter: (f) => !f.endsWith('.woff') });
  for (const css of cssFiles) {
    fs.copyFileSync(path.join(src, css), path.join(dst, css));
    links.push(`<link rel="stylesheet" href="fonts/${name}/${css}">`);
  }
}

// 2) 게임 본체
let html = fs.readFileSync(path.join(root, 'src', 'game.html'), 'utf8');
const fontLink = /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/;
if (!fontLink.test(html)) throw new Error('font link not found in game.html');
html = html.replace(fontLink, links.join('\n'));
if (!html.includes('</body>')) throw new Error('</body> not found');
html = html.replace('</body>', '<script src="native.js"></script>\n</body>');
fs.writeFileSync(path.join(www, 'index.html'), html);

// 3) 기기 연결 스크립트
await build({
  entryPoints: [path.join(root, 'src', 'native.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  // 출시 빌드(SSOK_RELEASE=1)에서만 실제 광고를 씁니다.
  define: { __TEST_ADS__: process.env.SSOK_RELEASE ? 'false' : 'true' },
  outfile: path.join(www, 'native.js'),
});
console.log(process.env.SSOK_RELEASE ? 'RELEASE build: real ads' : 'test build: test ads');
console.log('www built:', fs.readdirSync(www).join(', '));

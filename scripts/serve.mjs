import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(projectRoot, process.argv[2] || '.');
const port = Number(process.argv[3] || process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

createServer(async (request, response) => {
  let file;
  let info;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const parts = pathname.split('/').filter(Boolean);
    if (parts.some((part) => part === '.' || part === '..')) throw new Error('Invalid path');
    const top = parts[0] || '';
    const publicRootFile = parts.length === 1 && (
      top === 'index.html' || top === '.image-slots.state.json' || top === 'image-slots.state.json' ||
      top.endsWith('.dc.html') || top.endsWith('.js') || top.endsWith('.png')
    );
    const publicAsset = ['case-study', 'sidenav-icons', 'vendor'].includes(top);
    if (parts.length && !publicRootFile && !publicAsset) throw new Error('Private path');
    file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Outside root');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache',
  });
  if (request.method === 'HEAD') return response.end();
  createReadStream(file).pipe(response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});

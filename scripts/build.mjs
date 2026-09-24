import { copyFile, cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const entries = await readdir(root);
const files = entries.filter((name) => name.endsWith('.dc.html') || name.endsWith('.js') || name.endsWith('.png'));
files.push('index.html');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((name) => copyFile(path.join(root, name), path.join(output, name))));
await copyFile(path.join(root, '.image-slots.state.json'), path.join(output, 'image-slots.state.json'));
await Promise.all(['case-study', 'sidenav-icons', 'vendor'].map((name) =>
  cp(path.join(root, name), path.join(output, name), { recursive: true })
));
console.log(`Built ${files.length} files and asset directories in dist/`);

import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor');
await mkdir(vendor, { recursive: true });
await Promise.all([
  copyFile(path.join(root, 'node_modules/react/umd/react.production.min.js'), path.join(vendor, 'react.production.min.js')),
  copyFile(path.join(root, 'node_modules/react-dom/umd/react-dom.production.min.js'), path.join(vendor, 'react-dom.production.min.js')),
]);

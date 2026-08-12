import { Router } from 'express';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { authRequired } from './middleware.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

router.get('/source', authRequired, (req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="balanga-kalinga-source.zip"');

  try {
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => (console.error('Archiver error:', err.message), res.status(500).end()));
    archive.pipe(res);

    archive.file(join(PROJECT_ROOT, 'package.json'), { name: 'package.json' });
    archive.file(join(PROJECT_ROOT, 'download-project.ps1'), { name: 'download-project.ps1' });

    for (const folder of ['server', 'client']) {
      archive.glob(`${folder}/**/*`, {
        cwd: PROJECT_ROOT,
        ignore: EXCLUDE_IGNORES,
      });
    }
    archive.finalize();
  } catch (err) {
    console.log('Download handler error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

const EXCLUDE_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/data/**',
  'server/**/*.db',
  'balanga-kalinga-source.zip',
];

export default router;
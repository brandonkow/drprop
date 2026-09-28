import { readdir, readFile, writeFile } from 'node:fs/promises';
const files = (await readdir('brand/licenses')).sort();
const notices = await Promise.all(files.map(async file => `${file}\n${'='.repeat(file.length)}\n${await readFile(`brand/licenses/${file}`, 'utf8')}`));
await writeFile('public/third-party-notices.txt', ('DR. PROP — Third-party notices\n\n' + notices.join('\n\n')).trimEnd() + '\n');

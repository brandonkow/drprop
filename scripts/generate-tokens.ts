import { writeFile } from 'node:fs/promises';
import { tokens } from '../brand/tokens.ts';
await writeFile(new URL('../brand/tokens.css', import.meta.url),
  '/* Generated from tokens.ts. Run npm run tokens after editing. */\n:root {\n' +
  Object.entries(tokens).map(([key, value]) => `  --${key}: ${value};`).join('\n') + '\n}\n');

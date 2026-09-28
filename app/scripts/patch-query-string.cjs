// query-string 7 expects CommonJS; the fixed decoder 0.5 is ESM.
// Keep Expo's supported router API while adapting only this import boundary.
const fs = require('node:fs');
const path = require('node:path');
const target = require.resolve('query-string');
const manifest = JSON.parse(fs.readFileSync(path.join(path.dirname(target), 'package.json'), 'utf8'));
if (manifest.version !== '7.1.3') throw new Error('Review the decoder adapter for the new query-string version.');
const before = "const decodeComponent = require('decode-uri-component');";
const after = "const decodeModule = require('decode-uri-component');\nconst decodeComponent = decodeModule.default || decodeModule;";
const source = fs.readFileSync(target, 'utf8');
if (source.includes(before)) fs.writeFileSync(target, source.replace(before, after));
else if (!source.includes(after)) throw new Error('Unexpected query-string decoder import.');
console.log('Applied the CommonJS adapter for decode-uri-component 0.5.');

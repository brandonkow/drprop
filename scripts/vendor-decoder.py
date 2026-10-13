from pathlib import Path
import json,urllib.request,tarfile,io,hashlib,base64
R=Path(__file__).resolve().parents[1]
metadata=json.load(urllib.request.urlopen('https://registry.npmjs.org/decode-uri-component/0.5.0'))
raw=urllib.request.urlopen(metadata['dist']['tarball']).read()
assert 'sha512-'+base64.b64encode(hashlib.sha512(raw).digest()).decode()==metadata['dist']['integrity']
tar=tarfile.open(fileobj=io.BytesIO(raw));out=R/'vendor/decode-uri-component';out.mkdir(parents=True,exist_ok=True)
source=tar.extractfile('package/index.js').read().decode('utf-8')
assert source.count('export default function decodeUriComponent(')==1
source=source.replace('export default function decodeUriComponent(', 'module.exports = function decodeUriComponent(')
(out/'index.cjs').write_text(source,encoding='utf-8')
license_name=next(n for n in tar.getnames() if n.lower() in ['package/license','package/license.md','package/license.txt'])
(out/'LICENSE').write_bytes(tar.extractfile(license_name).read())
(out/'package.json').write_text(json.dumps({'name':'decode-uri-component','version':'0.5.0','private':True,'main':'index.cjs','license':'MIT'},indent=2)+'\n',encoding='utf-8')
(out/'README.md').write_text('''# SDK 57 decoder compatibility

Upstream `decode-uri-component` 0.5.0 fixes GHSA-vcc3-ghjq-m6fr, but is ESM-only.
Expo Router 57 depends on CommonJS `query-string`, which requires a callable
CommonJS export. This copy changes only `export default function` to
`module.exports = function`; the upstream decoding algorithm is unchanged.
The MIT licence is included. The source tarball was checked against npm's SHA512
integrity before conversion. Remove this compatibility copy when the SDK's
query parser supports the patched upstream module directly.

Source: https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0
Advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr
Tarball integrity: `'''+metadata['dist']['integrity']+'`\n',encoding='utf-8')

# After regeneration, verify parser resolution with app/test/decoder.test.ts.

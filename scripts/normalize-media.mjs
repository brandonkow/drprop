// One-time compatibility repair for a completed legacy full-range JPEG batch.
// New renders already request BT.709 directly from Remotion.
import assert from 'node:assert/strict';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const run=(command,args)=>{const result=spawnSync(command,args,{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${command}: ${result.stderr}`);return result.stdout;};
const probe=file=>JSON.parse(run('ffprobe',['-v','error','-select_streams','v:0','-show_streams','-of','json',file])).streams[0];
const hash=data=>createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(await readFile('out/manifest-video.json','utf8'));
assert.equal(manifest.outputs.length,28,'Wait for the full render batch to finish.');
for(const item of manifest.outputs){
  assert.equal(path.basename(item.file),item.file);
  const file=path.join('out',item.file),video=probe(file);
  if(video.pix_fmt!=='yuv420p'||video.color_range!=='tv'||video.color_space!=='bt709'){
    assert.equal(video.color_range,'pc');assert.equal(video.color_space,'bt470bg');
    const sourceHash=hash(await readFile(file));const temp=path.join('out',`${path.parse(item.file).name}.normalized.mp4`);
    run('ffmpeg',['-v','error','-y','-i',file,'-map','0:v:0','-map','0:a:0','-vf','scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=full:out_range=limited,format=yuv420p','-c:v','libx264','-preset','medium','-crf','18','-threads','2','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','copy','-movflags','+faststart',temp]);
    const checked=probe(temp);assert.equal(checked.pix_fmt,'yuv420p');assert.equal(checked.color_range,'tv');assert.equal(checked.color_space,'bt709');assert.equal(checked.nb_frames,video.nb_frames);
    await rename(temp,file);item.normalization={sourceSha256:sourceHash,conversion:'Full-range BT.601 JPEG-derived video to limited-range BT.709; libx264 CRF 18; AAC copied.'};
  }
  const data=await readFile(file);item.bytes=data.length;item.sha256=hash(data);
  manifest.delivery={codec:'h264',pixelFormat:'yuv420p',colorSpace:'bt709',colorRange:'tv',audio:'silent AAC'};
  await writeFile('out/manifest-video.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(`BT.709 ready: ${item.file}`);
}

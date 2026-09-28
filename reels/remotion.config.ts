/**
 * Remotion CLI config (studio and one-off renders). scripts/render-all.ts sets
 * the same options through the Node API.
 */
import { Config } from '@remotion/cli/config';

// WebGL for the 3D reels. 'angle' on machines with a GPU; set
// REMOTION_GL=swangle for GPU-less servers (SwiftShader).
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as 'angle' | 'swangle' | undefined) ?? 'angle');
// Brand assets (3D models, sound logo) are served from /brand, shared with web and app.
Config.setPublicDir('../brand');
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setOverwriteOutput(true);
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);

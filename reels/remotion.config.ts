import { Config } from '@remotion/cli/config';
Config.setChromiumOpenGlRenderer('angle');
Config.setCodec('h264');
Config.setVideoImageFormat('jpeg');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setConcurrency(2);

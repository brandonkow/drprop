import { defineConfig } from 'vite';
const notice = `/*!
 * GSAP 3.15.0 / ScrollTrigger — Copyright 2008-2026 GreenSock. All rights reserved.
 * Author: Jack Doyle. https://gsap.com/standard-license/
 * three.js — Copyright 2010-2026 three.js authors. MIT.
 * Lenis — Copyright 2024 darkroom.engineering. MIT.
 * Fluid shaders — Copyright (c) 2017 Pavel Dobryakov. MIT.
 * Full notices and licenses: /third-party-notices.txt
 */`;
export default defineConfig({
  plugins: [{
    name: 'retain-third-party-notices',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') file.code = `${notice}\n${file.code}`;
      }
    },
  }],
});

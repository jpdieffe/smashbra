# Third-party components

- **EmulatorJS 4.2.3**, GPL-3.0: https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3. Vendored runtime, CSS, decompression helpers and loader in `site/vendor/emulator/`. License included as `LICENSE`. The loader disables the upstream update probe, as in the existing game projects; no other runtime source modification is required.
- **ParaLLEl N64 / Mupen64Plus**, GPL-2.0 and component licenses: https://github.com/libretro/parallel-n64. EmulatorJS’s pinned core artifacts are from https://cdn.emulatorjs.org/4.2.3/data/cores/. Build reports are included under `cores/reports/`; core packages include their upstream metadata and license. Additional upstream notices are included as `PARALLEL-N64-LICENSE`, `RSP-HLE-LICENSE`, and `GLES2N64-LICENSE`. EmulatorJS build sources: https://github.com/EmulatorJS/build and https://github.com/EmulatorJS/RetroArch.
- **PeerJS 1.5.5**, MIT: https://github.com/peers/peerjs/tree/v1.5.5. Vendored minified browser client and `PEERJS-LICENSE` are under `site/vendor/`.
- **Playwright**, Apache-2.0: development/test dependency only. https://github.com/microsoft/playwright.
- **Super Smash Bros. (USA)**: original game and characters belong to Nintendo and their respective owners. The ROM was supplied by the project owner and is preserved unchanged. It is not covered by the emulator or application licenses. This is an unofficial fan project.

N64 core selection and controller IDs were checked against the [EmulatorJS N64 documentation](https://emulatorjs.org/docs/systems/nintendo-64/), [control mapping](https://emulatorjs.org/docs4devs/control-mapping/), and the pinned runtime’s N64 virtual-controller implementation.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite-plugin-pwa/client" />
declare module '@fontsource-variable/inter' {}
declare const __APP_VERSION__: string;
declare const __APP_LICENSE__: string;

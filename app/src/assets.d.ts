/** Bundled files Metro serves as assets: the import is an asset module id. */
declare module '*.pdf' {
  const asset: number;
  export default asset;
}

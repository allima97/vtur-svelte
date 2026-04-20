import * as universal from '../entries/pages/_layout.ts.js';
import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.D_yMO7yv.js","_app/immutable/chunks/DqoWP1RP.js","_app/immutable/chunks/Dri0jQJv.js","_app/immutable/chunks/Ba9DT-lZ.js","_app/immutable/chunks/Creh2C7M.js","_app/immutable/chunks/CbF1KH63.js","_app/immutable/chunks/BY52yhMX.js","_app/immutable/chunks/BhVfrG3W.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/DUp_1GFl.js","_app/immutable/chunks/CopSgNbS.js","_app/immutable/chunks/CAoAuZMk.js","_app/immutable/chunks/DrfHg5GC.js"];
export const stylesheets = ["_app/immutable/assets/0.C6PqFBwN.css"];
export const fonts = [];

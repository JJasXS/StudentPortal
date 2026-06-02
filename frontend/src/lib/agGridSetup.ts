import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

let registered = false;

/** Register AG Grid community modules once per app load. */
export function ensureAgGridModules() {
  if (registered) return;
  ModuleRegistry.registerModules([AllCommunityModule]);
  registered = true;
}

import "fake-indexeddb/auto";

// Skip app boot / auto-side-effects when modules are imported under Vitest.
globalThis.__RECORDER_TEST__ = true;

// Keeps uploaded reports (parsed readings + the PDF itself) in the browser's IndexedDB.
window.Store = (function () {
  const DB = "visarjan-ghat-watch", OS = "uploads";
  function open() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("IndexedDB not available"));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(OS, { keyPath: "id", autoIncrement: true });
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(OS, mode), s = t.objectStore(OS);
      const r = fn(s);
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    });
  }
  return {
    all: () => tx("readonly", (s) => s.getAll()).catch(() => []),
    add: (u) => tx("readwrite", (s) => s.add(u)),
    clear: () => tx("readwrite", (s) => s.clear()),
  };
})();

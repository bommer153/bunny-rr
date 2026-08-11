export const APP_CONFIG = {
  title: "Bunny Anniv Round Robin",
  apiBase: import.meta.env.VITE_JSONBIN_API_BASE || "https://api.jsonbin.io/v3",
  masterKey: import.meta.env.VITE_JSONBIN_MASTER_KEY || "",
  accessKey: import.meta.env.VITE_JSONBIN_ACCESS_KEY || "",
  binId: import.meta.env.VITE_JSONBIN_BIN_ID || "",
};

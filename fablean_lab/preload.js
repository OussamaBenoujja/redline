const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // File I/O
    log: (msg) => ipcRenderer.invoke('log', msg),
    readTextFile: (relativePath) => ipcRenderer.invoke('readTextFile', relativePath),

    // Caching
    getCachedImagePath: (key) => ipcRenderer.invoke('getCachedImagePath', key),
    saveImageBase64: (key, base64Data) => ipcRenderer.invoke('saveImageBase64', key, base64Data),

    // Generation Stubs
    fetchScenePrompt: (text, meta) => ipcRenderer.invoke('fetchScenePrompt', text, meta),
    fetchImage: (payload) => ipcRenderer.invoke('fetchImage', payload)
});

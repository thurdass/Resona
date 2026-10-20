const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('resona', {
    chooseFiles: () => ipcRenderer.invoke('resona:choose', 'files'),
    chooseFolder: () => ipcRenderer.invoke('resona:choose', 'folder'),
    importDrop: files => ipcRenderer.invoke('resona:drop', Array.from(files, file => webUtils.getPathForFile(file)).filter(Boolean)),
});

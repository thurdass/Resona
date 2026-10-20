const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { importFiles } = require('./files.cjs');
const { startServer } = require('./server.cjs');

app.setName('Resona');
const root = path.join(__dirname, '..');
let server;
let exiting = false;
const smoke = process.argv.includes('--smoke-test');
const output = process.env.RESONA_SMOKE_OUTPUT;
if (process.env.RESONA_DATA_DIR) app.setPath('userData', process.env.RESONA_DATA_DIR);
if (smoke && output) app.setPath('userData', path.join(output, 'profile'));

if (!app.requestSingleInstanceLock()) app.quit();
else {
    app.on('second-instance', () => { const win = BrowserWindow.getAllWindows()[0]; if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
    app.whenReady().then(async () => {
        server = await startServer(root, app.getPath('userData'), process.env.RESONA_PHP || (app.isPackaged ? path.join(process.resourcesPath, 'php', 'bin', process.platform === 'win32' ? 'php.exe' : 'php') : 'php'));
        const win = new BrowserWindow({ width: 1280, height: 850, minWidth: 640, minHeight: 600, title: 'Resona', backgroundColor: '#141c2b',
            icon: path.join(root, 'public/resona.svg'), show: true,
            webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: !smoke, partition: 'persist:resona' } });
        win.setMenuBarVisibility(false);
        win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        win.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== server.origin) event.preventDefault(); });
        const trusted = event => {
            if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || new URL(event.senderFrame.url).origin !== server.origin) throw new Error('Origem não autorizada.');
        };
        ipcMain.handle('resona:choose', async (event, kind) => {
            trusted(event);
            const selection = await dialog.showOpenDialog(win, kind === 'folder' ? { properties: ['openDirectory'] } : { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Áudio', extensions: ['mp3', 'flac', 'wav', 'ogg', 'opus', 'm4a', 'aac', 'aiff', 'webm'] }] });
            return selection.canceled ? { imported: 0, skipped: 0, errors: [] } : importFiles(server, selection.filePaths);
        });
        ipcMain.handle('resona:drop', async (event, paths) => {
            trusted(event);
            if (!Array.isArray(paths) || paths.length > 500 || paths.some(value => typeof value !== 'string' || !path.isAbsolute(value))) throw new Error('Seleção inválida.');
            return importFiles(server, paths);
        });
        win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
        win.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith(server.origin + '/') && !details.url.startsWith('devtools:') }));
        await win.loadURL(server.origin);
        server.child.once('exit', () => { if (!exiting) { dialog.showErrorBox('Resona', 'O servidor local foi encerrado. Abra o Resona novamente.'); app.quit(); } });
        if (smoke) {
            const watchdog = setTimeout(() => { console.error('Desktop smoke timed out'); server.stop(); app.exit(1); }, 30000);
            watchdog.unref();
            if (!output) throw new Error('Defina RESONA_SMOKE_OUTPUT para o teste desktop.');
            await fs.mkdir(output, { recursive: true });
            await fs.writeFile(path.join(output, 'home.png'), (await win.webContents.capturePage()).toPNG());
            await require('./smoke.cjs').runSmoke(win, server, output);
            clearTimeout(watchdog);
            app.quit();
        }
    }).catch(error => { console.error(error); if (!smoke) dialog.showErrorBox('Não foi possível abrir o Resona', error.message); server?.stop(); app.exit(1); });
}
app.on('before-quit', () => { exiting = true; server?.stop(); });
app.on('window-all-closed', () => app.quit());

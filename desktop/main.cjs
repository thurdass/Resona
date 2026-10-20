const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { startServer } = require('./server.cjs');

app.setName('Resona');
const root = path.join(__dirname, '..');
let server;
let exiting = false;
const smoke = process.argv.includes('--smoke-test');
const output = process.env.RESONA_SMOKE_OUTPUT;
if (smoke && output) app.setPath('userData', path.join(output, 'profile'));

if (!app.requestSingleInstanceLock()) app.quit();
else {
    app.on('second-instance', () => { const win = BrowserWindow.getAllWindows()[0]; if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
    app.whenReady().then(async () => {
        server = await startServer(root, app.getPath('userData'), process.env.RESONA_PHP || 'php');
        const win = new BrowserWindow({ width: 1280, height: 850, minWidth: 640, minHeight: 600, title: 'Resona', backgroundColor: '#111115',
            icon: path.join(root, 'public/resona.svg'), show: true,
            webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: !smoke, partition: 'persist:resona' } });
        win.setMenuBarVisibility(false);
        win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        win.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== server.origin) event.preventDefault(); });
        await win.loadURL(server.origin);
        server.child.once('exit', () => { if (!exiting) { dialog.showErrorBox('Resona', 'O servidor local foi encerrado. Abra o Resona novamente.'); app.quit(); } });
        if (smoke) {
            const watchdog = setTimeout(() => { console.error('Desktop smoke timed out'); server.stop(); app.exit(1); }, 30000);
            watchdog.unref();
            if (!output) throw new Error('Defina RESONA_SMOKE_OUTPUT para o teste desktop.');
            await fs.mkdir(output, { recursive: true });
            await fs.writeFile(path.join(output, 'home.png'), (await win.webContents.capturePage()).toPNG());
            await win.loadURL(`${server.origin}/search?q=aurora`);
            console.log('Desktop smoke: search loaded');
            await win.webContents.executeJavaScript(`(async () => {
                const button = document.querySelector('[data-save="primeira-luz"]');
                if (!button) throw new Error('Resultado da busca ausente');
                if (button.getAttribute('aria-pressed') === 'true') return;
                button.click();
                for (let i = 0; i < 40; i++) { if (button.getAttribute('aria-pressed') === 'true') return; await new Promise(r => setTimeout(r, 50)); }
                throw new Error('Faixa não foi salva');
            })()`);
            await win.loadURL(`${server.origin}/library`);
            const library = await win.webContents.executeJavaScript('document.querySelector("main").textContent');
            if (!library.includes('Primeira Luz')) throw new Error('Persistência na navegação falhou');
            await fs.writeFile(path.join(output, 'library.png'), (await win.webContents.capturePage()).toPNG());
            await win.loadURL(`${server.origin}/albums/entre-luzes`);
            await fs.writeFile(path.join(output, 'album.png'), (await win.webContents.capturePage()).toPNG());
            console.log('Desktop smoke: home, search, save, library, album passed');
            clearTimeout(watchdog);
            app.quit();
        }
    }).catch(error => { console.error(error); if (!smoke) dialog.showErrorBox('Não foi possível abrir o Resona', error.message); server?.stop(); app.exit(1); });
}
app.on('before-quit', () => { exiting = true; server?.stop(); });
app.on('window-all-closed', () => app.quit());

const { dialog } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
async function runSmoke(win, server, output) {
    const fixtures = path.join(output, 'fixtures'); await fs.mkdir(fixtures, { recursive: true });
    const first = path.join(fixtures, 'Maré & espaço #1.wav');
    const second = path.join(fixtures, 'Órbita 2.flac');
    const cover = path.join(fixtures, 'cover.ppm');
    await fs.writeFile(cover, Buffer.concat([Buffer.from('P6\n64 64\n255\n'), Buffer.from(Array.from({ length: 64 * 64 * 3 }, (_, index) => [240, 199, 123][index % 3]))]));
    for (const [file, frequency, title] of [[first, '440', 'Maré de teste'], [second, '660', 'Órbita de teste']]) {
        const result = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', `sine=frequency=${frequency}:duration=16`, ...(file === second ? ['-i', cover, '-map', '0:a', '-map', '1:v', '-c:a', 'flac', '-c:v', 'png', '-disposition:v', 'attached_pic', '-threads', '1'] : []), '-metadata', `title=${title}`, '-metadata', 'artist=Resona Sintético', '-metadata', 'album=Ensaios locais', file], { encoding: 'utf8' });
        if (result.status !== 0) throw new Error(result.stderr);
    }
    const errors = [];
    win.webContents.on('console-message', (_event, details) => { if (details.level === 'error') errors.push(details.message); });
    const run = code => win.webContents.executeJavaScript(code, true);
    const wait = async expression => {
        for (let i = 0; i < 100; i++) { if (await run(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
        throw new Error(`Condição não atingida: ${expression}; aviso: ${await run('document.querySelector("#notice").textContent')}; title: ${await run('document.querySelector("#view-title").textContent')}; errors: ${JSON.stringify(errors)}`);
    };
    const originalDialog = dialog.showOpenDialog;
    try {
        dialog.showOpenDialog = async (_win, options) => ({ canceled: false, filePaths: options.properties.includes('openDirectory') ? [fixtures] : [first, second] });
        await run('document.querySelector("#import-files").click()');
        await wait('document.querySelectorAll(".track").length === 2');
        await wait('document.querySelector(".track .cover img")?.naturalWidth === 64');
        await run('document.querySelector("#import-folder").click()');
        await wait('document.querySelector("#notice").textContent.includes("2 já estavam")');
        // Chromium supplies real File objects; exercise the same preload path as a drop.
        win.webContents.debugger.attach('1.3');
        await run('(() => { const input = document.createElement("input"); input.type = "file"; input.id = "drop-fixture"; input.hidden = true; document.body.append(input); })()');
        const root = await win.webContents.debugger.sendCommand('DOM.getDocument');
        const node = await win.webContents.debugger.sendCommand('DOM.querySelector', { nodeId: root.root.nodeId, selector: '#drop-fixture' });
        await win.webContents.debugger.sendCommand('DOM.setFileInputFiles', { nodeId: node.nodeId, files: [first] });
        await run('(() => { const transfer = new DataTransfer(); transfer.items.add(document.querySelector("#drop-fixture").files[0]); document.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer })); })()');
        await wait('document.querySelector("#notice").textContent.includes("1 já estavam")');
        win.webContents.debugger.detach();
        await run('document.querySelector(".track-play").click()');
        await wait('!document.querySelector("audio").paused && document.querySelector("audio").currentTime > 0.4');
        const before = await run('({ time: resonaPlayer.audio.currentTime, id: resonaPlayer.current })');
        await run('location.hash = "albums"');
        await wait('document.querySelector(".album") !== null && resonaPlayer.audio.currentTime > 0.8');
        const after = await run('({ time: resonaPlayer.audio.currentTime, id: resonaPlayer.current, decoded: resonaPlayer.audio.readyState, duration: resonaPlayer.audio.duration })');
        if (after.id !== before.id || after.time <= before.time || after.decoded < 2 || after.duration < 15) throw new Error('Continuidade ou decodificação falhou');
        await run('resonaPlayer.audio.currentTime = 8; document.querySelector("#volume").value = "0.35"; document.querySelector("#volume").dispatchEvent(new Event("input")); document.querySelector("#play").click()');
        await wait('resonaPlayer.audio.paused && resonaPlayer.audio.currentTime >= 8 && resonaPlayer.audio.volume === 0.35');
        await run('document.querySelector("#play").click(); resonaPlayer.audio.currentTime = resonaPlayer.audio.duration - 0.1');
        await wait('resonaPlayer.current !== ' + JSON.stringify(before.id) + ' && !resonaPlayer.audio.paused && resonaPlayer.audio.currentTime > 0.2');
        await run('location.hash = "library"'); await wait('document.querySelectorAll(".track").length === 2');
        await run('document.querySelector("button[aria-label^=Favoritar]").click()'); await wait('document.querySelector("button[aria-label^=Favoritar]").getAttribute("aria-pressed") === "true"');
        await run('document.querySelector("#new-playlist").click()');
        await new Promise(resolve => setTimeout(resolve, 150));
        await run('document.querySelector("#playlist-name").value = "Ensaios"; document.querySelector("#playlist-form").requestSubmit()');
        await wait('document.querySelector("#view-title").textContent === "Ensaios"');
        await run('location.hash = "library"'); await wait('document.querySelector(".track-menu") !== null');
        await run('document.querySelector(".track-menu").open = true; Array.from(document.querySelectorAll(".menu button")).find(b => b.textContent === "Adicionar a Ensaios").click()');
        await wait('document.querySelector("#notice").textContent === "Faixa adicionada à playlist."');
        // Shortcuts do not steal typing focus.
        await run('document.querySelector("#search").focus(); document.querySelector("#search").dispatchEvent(new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true }))');
        if (await run('resonaPlayer.audio.paused')) throw new Error('Atalho interferiu no campo');
        await run('document.querySelector("#search").blur(); document.querySelector("#notice").textContent = ""');
        await fs.writeFile(path.join(output, 'collection.png'), (await win.webContents.capturePage()).toPNG());
        win.setSize(680, 650); await new Promise(resolve => setTimeout(resolve, 250));
        if (await run('document.documentElement.scrollWidth > innerWidth')) throw new Error('Overflow horizontal na janela compacta');
        await fs.writeFile(path.join(output, 'compact.png'), (await win.webContents.capturePage()).toPNG());
        // Removing original produces a recoverable playback error.
        const current = await run('resonaPlayer.current');
        const state = await (await fetch(`${server.origin}/api/library`)).json();
        const title = state.tracks.find(t => t.id === current).title;
        await fs.unlink(title === 'Maré de teste' ? first : second);
        await run('resonaPlayer.audio.src = `/media/${resonaPlayer.current}?retry=missing`; resonaPlayer.audio.play().catch(() => {})');
        await wait('document.querySelector("#notice").textContent.includes("inacessível")');
        await run('document.querySelector("#clear-queue").click()');
        await wait('resonaPlayer.queue.length === 0 && resonaPlayer.audio.paused');
        await new Promise(resolve => setTimeout(resolve, 300));
        await win.loadURL(server.origin);
        await wait('document.querySelectorAll(".track").length === 2 && document.querySelector("#playlists a")?.textContent === "Ensaios"');
        if (!await run('resonaPlayer.audio.paused && resonaPlayer.audio.volume === 0.35 && document.querySelector("button[aria-label^=Favoritar][aria-pressed=true]") !== null')) throw new Error('Estado persistente ou ausência de autoplay falhou');
        const result = { before, after, checks: ['embedded FLAC cover decoded', 'reload restores preferences/favorite/playlist without autoplay', 'native multiple selection', 'folder deduplication', 'real File drag/drop IPC', 'WAV/FLAC decode and advancing time', 'navigation continuity', 'pause/seek/volume', 'natural end advances', 'favorite', 'playlist', 'typing shortcuts', 'compact layout', 'missing file recovery', 'clear queue'], audibleOutputVerified: false, consoleErrors: errors };
        await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
        console.log('Desktop smoke passed:', JSON.stringify(result));
    } finally { dialog.showOpenDialog = originalDialog; }
}
module.exports = { runSmoke };

const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const { mkdir, access, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

async function freePort() {
    const socket = net.createServer();
    await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    return port;
}

async function startServer(root, dataPath, php = 'php') {
    for (const folder of ['sessions', 'views']) await mkdir(path.join(dataPath, folder), { recursive: true });
    const keyPath = path.join(dataPath, 'app-key');
    let key;
    try { key = await readFile(keyPath, 'utf8'); } catch {
        key = `base64:${randomBytes(32).toString('base64')}`;
        await writeFile(keyPath, key, { mode: 0o600, flag: 'wx' });
    }
    const database = path.join(dataPath, 'library.sqlite');
    await writeFile(database, '', { flag: 'a', mode: 0o600 });
    const importToken = randomBytes(32).toString('hex');
    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    const environment = { ...process.env, DB_URL: '', DB_CONNECTION: 'sqlite', DB_DATABASE: database, RESONA_IMPORT_TOKEN: importToken, APP_NAME: 'Resona', APP_ENV: 'production', APP_DEBUG: 'false', APP_KEY: key.trim(), APP_URL: origin, APP_CONFIG_CACHE: path.join(dataPath, 'config.php'), SESSION_DRIVER: 'file', SESSION_FILES: path.join(dataPath, 'sessions'), SESSION_COOKIE: 'resona_session', CACHE_STORE: 'array', LOG_CHANNEL: 'stderr', VIEW_COMPILED_PATH: path.join(dataPath, 'views') };
    environment.APP_PACKAGES_CACHE = path.join(dataPath, 'packages.php');
    environment.APP_SERVICES_CACHE = path.join(dataPath, 'services.php');
    const migration = spawnSync(php, [path.join(root, 'artisan'), 'migrate', '--force', '--no-interaction'], { cwd: root, env: environment, encoding: 'utf8', windowsHide: true });
    if (migration.status !== 0) throw new Error(`Falha na migração: ${migration.stderr || migration.stdout}`);
    const child = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', path.join(root, 'public'), path.join(root, 'desktop/router.php')], {
        cwd: root,
        env: environment,
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
    });
    let failure;
    let logs = '';
    child.on('error', error => { failure = error; });
    child.stderr.on('data', data => { logs = (logs + data.toString()).slice(-5000); });
    try {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (failure) throw failure;
            if (child.exitCode !== null) throw new Error(`PHP encerrou: ${logs}`);
            try {
                const response = await fetch(`${origin}/up`, { signal: AbortSignal.timeout(500) });
                if (response.ok) return { origin, child, importToken, stop: () => { if (child.exitCode === null) child.kill(); } };
            } catch { /* waiting for Laravel startup */ }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Laravel não respondeu em tempo: ${logs}`);
    } catch (error) {
        if (child.exitCode === null) child.kill();
        throw error;
    }
}
module.exports = { startServer };

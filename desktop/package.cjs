const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { build, Platform, Arch } = require('electron-builder');

const root = path.join(__dirname, '..');
const phpCommit = 'e0c212d36422e5aa1f7357ec0524d99de8ee79bf';
const runtimes = {
    linux: { directory: 'linux', executable: 'php', sha256: 'aeec695114d1d7a88e2a9aafd1a6ecb2388a1b61bdb17ec2a3294fe480936c91' },
    win32: { directory: 'win', executable: 'php.exe', sha256: '5b760f635c949e5d4f8b472dd9f0e87ca149f74afac70507fc2770f728c4e897' },
};

function command(executable, args, cwd = root, env = process.env) {
    const result = spawnSync(executable, args, { cwd, env, stdio: 'inherit', windowsHide: true, shell: process.platform === 'win32' && executable === 'composer' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${executable} falhou: ${result.status}`);
}

async function packageApplication() {
    const runtime = runtimes[process.platform];
    if (!runtime || process.arch !== 'x64') throw new Error('Execute em Linux x64 ou Windows x64 para gerar o pacote nativo.');
    const stage = path.join(root, 'dist', `stage-${process.platform}`);
    const appRoot = path.join(stage, 'app');
    const phpDirectory = path.join(stage, 'php', 'bin');
    const archive = path.join(root, 'dist', `php-8.3-${process.platform}.zip`);
    const phpUrl = `https://raw.githubusercontent.com/NativePHP/php-bin/${phpCommit}/bin/${runtime.directory}/x64/php-8.3.zip`;
    await fs.mkdir(path.dirname(archive), { recursive: true });
    try { await fs.access(archive); } catch {
        const response = await fetch(phpUrl);
        if (!response.ok) throw new Error(`Falha no download do PHP: ${response.status}`);
        await fs.writeFile(archive, Buffer.from(await response.arrayBuffer()));
    }
    if (createHash('sha256').update(await fs.readFile(archive)).digest('hex') !== runtime.sha256) throw new Error('Hash inesperado para PHP.');
    await fs.rm(stage, { recursive: true, force: true });
    await fs.mkdir(appRoot, { recursive: true });
    for (const name of ['app', 'bootstrap', 'config', 'desktop', 'public', 'resources', 'routes', 'artisan', 'composer.json', 'composer.lock']) {
        await fs.cp(path.join(root, name), path.join(appRoot, name), {
            recursive: true,
            filter: source => !source.endsWith('.test.cjs') && !/\.sqlite(?:-wal|-shm)?$/.test(source) && !source.endsWith('.log') && source !== path.join(root, 'public/storage') && source !== path.join(root, 'bootstrap/cache'),
        });
    }
    await fs.cp(path.join(root, 'database/migrations'), path.join(appRoot, 'database/migrations'), { recursive: true });
    const metadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
    await fs.writeFile(path.join(appRoot, 'package.json'), JSON.stringify({ name: metadata.name, version: metadata.version, main: metadata.main, description: 'Sua coleção de músicas locais, offline.', author: 'thurdass', license: 'MIT' }, null, 2));
    for (const folder of ['bootstrap/cache', 'storage/framework/views', 'storage/framework/sessions', 'storage/framework/cache/data', 'storage/logs']) await fs.mkdir(path.join(appRoot, folder), { recursive: true });
    command('composer', ['install', '--no-dev', '--prefer-dist', '--no-interaction', '--no-scripts', '--optimize-autoloader'], appRoot);
    await fs.mkdir(phpDirectory, { recursive: true });
    if (process.platform === 'win32') {
        command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Expand-Archive -LiteralPath $env:RESONA_PHP_ARCHIVE -DestinationPath $env:RESONA_PHP_DESTINATION -Force'], root, { ...process.env, RESONA_PHP_ARCHIVE: archive, RESONA_PHP_DESTINATION: phpDirectory });
    } else {
        command('unzip', ['-oq', archive, '-d', phpDirectory]);
        await fs.chmod(path.join(phpDirectory, runtime.executable), 0o755);
    }
    command(path.join(phpDirectory, runtime.executable), ['-r', 'foreach (["pdo_sqlite", "mbstring", "fileinfo", "openssl", "dom", "tokenizer", "session", "filter"] as $extension) { if (!extension_loaded($extension)) { fwrite(STDERR, "Missing: ".$extension); exit(1); } } echo PHP_VERSION, PHP_EOL;']);
    await fs.copyFile(path.join(root, 'desktop/PHP-LICENSE'), path.join(stage, 'php/PHP-LICENSE'));
    await fs.cp(path.join(root, 'desktop/php-licenses'), path.join(stage, 'php/licenses'), { recursive: true });
    await fs.writeFile(path.join(stage, 'php/PHP-NOTICE.txt'), `PHP 8.3 runtime redistributed from NativePHP/php-bin; framework NativePHP is not included.\nCommit: ${phpCommit}\nSource: ${phpUrl}\nArchive SHA256: ${runtime.sha256}\nBuild sources: https://github.com/NativePHP/php-bin/tree/${phpCommit}\nSee PHP-LICENSE and licenses for redistribution notices.\n`);
    await build({
        targets: (process.platform === 'win32' ? Platform.WINDOWS : Platform.LINUX).createTarget(process.platform === 'win32' ? ['nsis', 'zip'] : ['deb', 'tar.gz'], Arch.x64),
        publish: 'never',
        config: {
            appId: 'com.thurdass.resona', productName: 'Resona', executableName: 'resona',
            electronVersion: require('electron/package.json').version,
            directories: { app: appRoot, output: path.join(root, 'dist/release') },
            asar: false, npmRebuild: false, compression: 'normal',
            files: ['**/*'],
            extraResources: [{ from: path.join(stage, 'php'), to: 'php' }],
            artifactName: 'Resona-${version}-${os}-${arch}.${ext}',
            linux: { icon: path.join(root, 'desktop/icon.png'), category: 'AudioVideo', maintainer: 'thurdass <thurdass@users.noreply.github.com>', executableArgs: [], desktop: { entry: { Comment: 'Sua coleção de músicas locais' } } },
            win: { icon: path.join(root, 'desktop/icon.ico'), signAndEditExecutable: false },
            nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, deleteAppDataOnUninstall: false },
        },
    });
}

packageApplication().catch(error => { console.error(error); process.exitCode = 1; });

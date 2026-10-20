// Linux x64 portable directory + archive. No publishing or global installation.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.join(__dirname, '..');
const output = path.join(root, 'dist', 'resona-linux-x64');
const phpSha = 'aeec695114d1d7a88e2a9aafd1a6ecb2388a1b61bdb17ec2a3294fe480936c91';
const phpUrl = 'https://raw.githubusercontent.com/NativePHP/php-bin/e0c212d36422e5aa1f7357ec0524d99de8ee79bf/bin/linux/x64/php-8.3.zip';
function command(executable, args, cwd = root) { const result = spawnSync(executable, args, { cwd, stdio: 'inherit' }); if (result.status !== 0) throw new Error(`${executable} falhou: ${result.status}`); }
(async () => {
    if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Este empacotador atende Linux x64.');
    await fs.mkdir(path.dirname(output), { recursive: true });
    const archive = path.join(root, 'dist', 'php-8.3.zip');
    try { await fs.access(archive); } catch { const response = await fetch(phpUrl); if (!response.ok) throw new Error('Falha no download do PHP'); await fs.writeFile(archive, Buffer.from(await response.arrayBuffer())); }
    if (createHash('sha256').update(await fs.readFile(archive)).digest('hex') !== phpSha) throw new Error('Hash inesperado para PHP.');
    await fs.rm(output, { recursive: true, force: true });
    await fs.cp(path.join(root, 'node_modules/electron/dist'), output, { recursive: true });
    await fs.rename(path.join(output, 'electron'), path.join(output, 'resona'));
    await fs.rm(path.join(output, 'resources/default_app.asar'), { force: true });
    const appRoot = path.join(output, 'resources/app'); await fs.mkdir(appRoot, { recursive: true });
    for (const name of ['app', 'bootstrap', 'config', 'database', 'desktop', 'public', 'resources', 'routes', 'artisan', 'composer.json', 'composer.lock', 'package.json']) {
        await fs.cp(path.join(root, name), path.join(appRoot, name), { recursive: true, filter: source => !source.endsWith('.sqlite') && !source.endsWith('/bootstrap/cache/config.php') });
    }
    for (const name of ['bootstrap/cache/packages.php', 'bootstrap/cache/services.php']) await fs.rm(path.join(appRoot, name), { force: true });
    for (const folder of ['storage/framework/views', 'storage/framework/sessions', 'storage/framework/cache/data', 'storage/logs']) await fs.mkdir(path.join(appRoot, folder), { recursive: true });
    command('composer', ['install', '--no-dev', '--prefer-dist', '--no-interaction', '--no-scripts', '--optimize-autoloader'], appRoot);
    const phpDirectory = path.join(output, 'resources/php/bin'); await fs.mkdir(phpDirectory, { recursive: true });
    command('unzip', ['-oq', archive, '-d', phpDirectory]); await fs.chmod(path.join(phpDirectory, 'php'), 0o755);
    command(path.join(phpDirectory, 'php'), ['-r', 'foreach (["pdo_sqlite", "mbstring", "fileinfo", "openssl", "dom", "tokenizer"] as $extension) { if (!extension_loaded($extension)) { exit(1); } }']);
    await fs.writeFile(path.join(output, 'resona.desktop'), '[Desktop Entry]\nType=Application\nName=Resona\nComment=Sua coleção de músicas locais\nExec=resona\nIcon=resona\nTerminal=false\nCategories=AudioVideo;Audio;Player;\n');
    await fs.copyFile(path.join(root, 'public/resona.svg'), path.join(output, 'resona.svg'));
    await fs.copyFile(path.join(root, 'desktop/PHP-LICENSE'), path.join(output, 'PHP-LICENSE'));
    await fs.writeFile(path.join(output, 'PHP-NOTICE.txt'), `PHP 8.3.31 (NativePHP/php-bin), commit e0c212d36422e5aa1f7357ec0524d99de8ee79bf.\nSource: ${phpUrl}\nArchive SHA256: ${phpSha}\nPHP license: https://www.php.net/license/3_01.txt\nNativePHP binary build sources: https://github.com/NativePHP/php-bin\n`);
    // Preserve Composer packages' license files and Electron notices in the bundle.
    command('tar', ['-czf', path.join(root, 'dist/resona-linux-x64.tar.gz'), '-C', path.join(root, 'dist'), 'resona-linux-x64']);
    console.log(`Pacote local: ${output}`);
})().catch(error => { console.error(error); process.exitCode = 1; });

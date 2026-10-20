const fs = require('node:fs/promises');
const path = require('node:path');
const extensions = new Set(['.mp3', '.flac', '.wav', '.ogg', '.opus', '.m4a', '.aac', '.aiff', '.aif', '.webm']);
async function collectAudio(inputs) {
    const files = new Set();
    const errors = [];
    const visited = new Set();
    async function visit(input, explicit = false) {
        try {
            const stat = await fs.lstat(input);
            if (stat.isSymbolicLink()) { errors.push(`${path.basename(input)}: link simbólico ignorado.`); return; }
            if (stat.isDirectory()) {
                const real = await fs.realpath(input);
                if (visited.has(real)) return;
                visited.add(real);
                for (const entry of await fs.readdir(input)) await visit(path.join(input, entry));
            } else if (stat.isFile() && extensions.has(path.extname(input).toLowerCase())) files.add(await fs.realpath(input));
            else if (explicit) errors.push(`${path.basename(input)}: escolha um arquivo de áudio suportado.`);
        } catch { errors.push(`${path.basename(input)}: sem acesso ao arquivo ou pasta.`); }
    }
    for (const input of inputs) await visit(input, true);
    return { files: [...files], errors };
}
async function importFiles(server, inputs) {
    const { files, errors } = await collectAudio(inputs);
    const result = { imported: 0, skipped: 0, errors };
    for (let index = 0; index < files.length; index += 100) {
        const response = await fetch(`${server.origin}/internal/import`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Resona-Import': server.importToken }, body: JSON.stringify({ paths: files.slice(index, index + 100) }) });
        if (!response.ok) throw new Error('Não foi possível importar. Verifique o acesso aos arquivos.');
        const batch = await response.json();
        result.imported += batch.imported; result.skipped += batch.skipped; result.errors.push(...batch.errors);
    }
    return result;
}
module.exports = { collectAudio, importFiles };

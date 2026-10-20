const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { collectAudio } = require('./files.cjs');
test('folder discovery handles special names, deduplicates paths, ignores links and reports invalid selections', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'resona-files-'));
    try {
        const folder = path.join(root, 'Canções & espaços #'); await fs.mkdir(folder);
        const audio = path.join(folder, 'ação.WAV'); await fs.writeFile(audio, 'fixture');
        const text = path.join(folder, 'texto.txt'); await fs.writeFile(text, 'text');
        await fs.symlink(root, path.join(folder, 'loop'), process.platform === 'win32' ? 'junction' : 'dir');
        const result = await collectAudio([folder, audio, text, path.join(root, 'missing')]);
        assert.deepEqual(result.files, [audio]); assert.equal(result.errors.length, 3);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
});

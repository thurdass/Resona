const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { startServer } = require('./server.cjs');
const { importFiles } = require('./files.cjs');
function wav() {
    const buffer = Buffer.alloc(16044); buffer.write('RIFF'); buffer.writeUInt32LE(16036, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(16000, 40); return buffer;
}
async function stop(server) { const exited = new Promise(resolve => server.child.once('exit', resolve)); server.stop(); await exited; }
test('desktop imports original audio and persists SQLite across restarts with CSRF protection', async () => {
    const data = await mkdtemp(path.join(os.tmpdir(), 'resona-test-')); let server;
    try {
        const audio = path.join(data, 'ação & # música.wav'); await writeFile(audio, wav());
        server = await startServer(path.join(__dirname, '..'), data);
        assert.deepEqual(await importFiles(server, [audio, audio]), { imported: 1, skipped: 0, errors: [] });
        assert.equal((await importFiles(server, [audio])).skipped, 1);
        let response = await fetch(`${server.origin}/api/library`); const id = (await response.json()).tracks[0].id;
        response = await fetch(`${server.origin}/media/${id}`, { headers: { Range: 'bytes=0-43' } }); assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 44);
        response = await fetch(`${server.origin}/api/tracks/${id}/favorite`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ favorite: true }) }); assert.equal(response.status, 419);
        response = await fetch(server.origin); const cookies = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; '); const token = (await response.text()).match(/name="csrf-token" content="([^"]+)"/)[1];
        response = await fetch(`${server.origin}/api/tracks/${id}/favorite`, { method: 'PUT', headers: { Cookie: cookies, 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ favorite: true }) }); assert.equal(response.status, 200);
        await stop(server); server = await startServer(path.join(__dirname, '..'), data);
        response = await fetch(`${server.origin}/api/library`); const state = await response.json(); assert.equal(state.tracks[0].id, id); assert.equal(state.tracks[0].favorite, true); assert.equal(state.tracks[0].path, undefined);
        response = await fetch(`${server.origin}/api/library`, { headers: { Origin: 'https://external.invalid' } }); assert.equal(response.headers.get('access-control-allow-origin'), null);
        const hostStatus = await new Promise((resolve, reject) => { http.get(`${server.origin}/api/library`, { headers: { Host: 'external.invalid' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject); }); assert.equal(hostStatus, 400);
        response = await fetch(`${server.origin}/internal/import`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ paths: [audio] }) }); assert.equal(response.status, 403);
    } finally { if (server && server.child.exitCode === null) await stop(server); await rm(data, { recursive: true, force: true }); }
});
module.exports = { wav };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { startServer } = require('./server.cjs');

test('desktop persists library across server restarts and rejects missing CSRF', async () => {
    const data = await mkdtemp(path.join(os.tmpdir(), 'resona-test-'));
    let server;
    try {
        server = await startServer(path.join(__dirname, '..'), data);
        let response = await fetch(server.origin);
        const cookies = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
        const html = await response.text();
        assert.match(html, /Deixe o mundo/);
        const token = html.match(/name="csrf-token" content="([^"]+)"/)[1];
        response = await fetch(`${server.origin}/library/tracks/primeira-luz`, { method: 'POST', headers: { Cookie: cookies, 'X-CSRF-TOKEN': token, Accept: 'application/json' } });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).saved, true);
        const updatedCookies = response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
        const exited = new Promise(resolve => server.child.once('exit', resolve));
        server.stop(); await exited;
        server = await startServer(path.join(__dirname, '..'), data);
        response = await fetch(`${server.origin}/library`, { headers: { Cookie: updatedCookies } });
        assert.match(await response.text(), /Primeira Luz/);
        response = await fetch(`${server.origin}/library/tracks/sal`, { method: 'POST', headers: { Accept: 'application/json' } });
        assert.equal(response.status, 419);
        response = await fetch(`${server.origin}/resona.css`);
        assert.match(response.headers.get('content-type'), /text\/css/);
    } finally {
        if (server && server.child.exitCode === null) {
            const exited = new Promise(resolve => server.child.once('exit', resolve));
            server.stop(); await exited;
        }
        await rm(data, { recursive: true, force: true });
    }
});

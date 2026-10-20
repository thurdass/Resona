const { test } = require('node:test');
const assert = require('node:assert/strict');
async function setup(random = () => 0) {
    const { Player } = await import('../public/player.js');
    const audio = new EventTarget(); Object.assign(audio, { paused: true, currentTime: 0, src: '', volume: 1, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; }, removeAttribute() { this.src = ''; }, load() {} });
    return new Player(audio, () => {}, () => {}, () => {}, random);
}
test('queue advances, repeats, removes current and clears without stale audio', async () => {
    const p = await setup(); await p.play('a', ['a', 'b', 'c']); p.advance(); assert.equal(p.current, 'b'); p.previous(); assert.equal(p.current, 'a');
    p.repeat = 'one'; p.audio.currentTime = 9; p.advance(true); assert.equal(p.current, 'a'); assert.equal(p.audio.currentTime, 0);
    p.repeat = 'off'; p.remove('a'); assert.equal(p.current, 'b'); p.remove('b'); assert.equal(p.current, 'c'); p.remove('c'); assert.equal(p.current, null); assert.equal(p.audio.src, ''); assert.equal(p.audio.paused, true);
    p.enqueue('a'); p.enqueue('a'); assert.deepEqual(p.queue, ['a']); p.clear(); assert.deepEqual(p.queue, []);
});
test('shuffle visits each track before repeating and errors terminate even with repeat enabled', async () => {
    const p = await setup(); p.shuffle = true; await p.play('a', ['a', 'b', 'c']); p.advance(true); assert.equal(p.current, 'b'); p.advance(true); assert.equal(p.current, 'c'); p.advance(true); assert.equal(p.audio.paused, true);
    await p.play('a', ['a', 'b', 'c']); p.repeat = 'all'; p.audio.dispatchEvent(new Event('error')); p.audio.dispatchEvent(new Event('error')); p.audio.dispatchEvent(new Event('error')); assert.equal(p.audio.paused, true); assert.equal(p.failedIds.size, 3);
});
test('restoration filters missing IDs and never autoplays', async () => {
    const p = await setup(); p.restore({ queue: ['a', 'missing'], current: 'a', volume: 0.3, shuffle: true, repeat: 'all' }, [{ id: 'a' }]); assert.deepEqual(p.queue, ['a']); assert.equal(p.audio.paused, true); assert.equal(p.audio.volume, 0.3);
});

test('a missing restored track or a paused track does not start the next track without user action', async () => {
    const p = await setup(); p.restore({ queue: ['a', 'b'], current: 'a' }, [{ id: 'a' }, { id: 'b' }]);
    p.audio.dispatchEvent(new Event('error')); assert.equal(p.current, 'a'); assert.equal(p.audio.paused, true);
    await p.play('a'); p.pause(); p.audio.dispatchEvent(new Event('error')); assert.equal(p.current, 'a'); assert.equal(p.audio.paused, true);
});

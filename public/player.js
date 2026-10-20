export class Player {
    constructor(audio, changed, persist, failed, random = Math.random) {
        Object.assign(this, { audio, changed, persist, failed, random });
        this.queue = []; this.current = null; this.shuffle = false; this.repeat = 'off'; this.history = []; this.failedIds = new Set(); this.cycle = new Set();
        audio.addEventListener('ended', () => this.advance(true));
        audio.addEventListener('error', () => { this.failedIds.add(this.current); this.failed('Arquivo removido, inacessível ou incompatível. Importe novamente ou escolha outra faixa.'); this.advance(true, true); });
        for (const event of ['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange']) audio.addEventListener(event, () => changed());
    }
    update() { this.changed(); this.persist(); }
    restore(preferences, tracks) {
        const ids = new Set(tracks.map(t => t.id));
        this.queue = (preferences.queue || []).filter(id => ids.has(id));
        this.current = this.queue.includes(preferences.current) ? preferences.current : null;
        this.shuffle = !!preferences.shuffle; this.repeat = ['off', 'all', 'one'].includes(preferences.repeat) ? preferences.repeat : 'off';
        this.audio.volume = typeof preferences.volume === 'number' ? Math.max(0, Math.min(1, preferences.volume)) : 0.8;
        if (this.current) this.audio.src = `/media/${this.current}`;
        this.changed();
    }
    async play(id, queue = null) {
        if (queue) { this.queue = [...new Set(queue)]; this.cycle.clear(); this.history = []; this.failedIds.clear(); }
        if (!this.queue.includes(id)) this.queue.push(id);
        if (this.current && this.current !== id) this.history.push(this.current);
        if (this.current !== id || !this.audio.src) { this.current = id; this.audio.src = `/media/${id}`; }
        this.cycle.add(id); this.update();
        try { await this.audio.play(); } catch (error) { if (error.name !== 'AbortError' && error.name !== 'NotSupportedError') this.failed('Use Reproduzir para iniciar o áudio.'); }
    }
    toggle() {
        if (!this.current && this.queue.length) return this.play(this.queue[0]);
        if (this.current) { if (this.audio.paused) { this.failedIds.clear(); this.audio.play().catch(() => this.failed('Não foi possível reproduzir esta faixa. Escolha outra.')); } else this.audio.pause(); }
    }
    advance(natural = false, error = false) {
        if (!this.queue.length) return;
        if (natural && !error && this.repeat === 'one') { this.audio.currentTime = 0; return this.play(this.current); }
        let next;
        if (this.shuffle) {
            let available = this.queue.filter(id => !this.cycle.has(id) && !this.failedIds.has(id));
            if (!available.length && this.repeat === 'all') { this.cycle.clear(); available = this.queue.filter(id => id !== this.current && !this.failedIds.has(id)); if (!available.length && !this.failedIds.has(this.current)) available = [this.current]; }
            next = available[Math.floor(this.random() * available.length)];
        } else {
            const index = this.queue.indexOf(this.current);
            const candidates = this.repeat === 'all' ? [...this.queue.slice(index + 1), ...this.queue.slice(0, index + 1)] : this.queue.slice(index + 1);
            next = candidates.find(id => !this.failedIds.has(id));
        }
        if (next) { if (next === this.current) this.audio.currentTime = 0; return this.play(next); }
        this.audio.pause(); this.changed();
    }
    previous() {
        if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
        const previous = this.shuffle ? this.history.pop() : this.queue[this.queue.indexOf(this.current) - 1];
        if (previous) { const history = [...this.history]; this.play(previous); this.history = history; }
    }
    enqueue(id) { if (!this.queue.includes(id)) this.queue.push(id); this.update(); }
    remove(id) {
        const index = this.queue.indexOf(id), wasPlaying = !this.audio.paused;
        this.queue = this.queue.filter(item => item !== id); this.history = this.history.filter(item => item !== id); this.cycle.delete(id);
        if (this.current === id) {
            this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.current = null;
            const next = this.queue[index] || this.queue[0];
            if (next && wasPlaying) this.play(next);
        }
        this.update();
    }
    clear() { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.queue = []; this.current = null; this.history = []; this.cycle.clear(); this.failedIds.clear(); this.update(); }
}

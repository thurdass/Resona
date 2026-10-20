import { Player } from './player.js';
const $ = selector => document.querySelector(selector);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const button = (label, action, className) => { const node = el('button', label, className); node.type = 'button'; node.addEventListener('click', action); return node; };
const time = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
let library = { tracks: [], playlists: [], preferences: {} }, importing = false, preferenceTimer;
function notify(text) { $('#notice').textContent = text; clearTimeout(notify.timer); notify.timer = setTimeout(() => { $('#notice').textContent = ''; }, 9000); }
async function api(path, method = 'GET', body) {
    const response = await fetch(path, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').content }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!response.ok) throw new Error('Não foi possível salvar. Tente novamente.');
    return response.json();
}
function persist() {
    clearTimeout(preferenceTimer);
    preferenceTimer = setTimeout(() => api('/api/preferences', 'PUT', { volume: player.audio.volume, shuffle: player.shuffle, repeat: player.repeat, queue: player.queue, current: player.current }).catch(error => notify(error.message)), 180);
}
function cover(track, small = false) {
    const node = el('div', undefined, `cover${small ? ' small-cover' : ''}`);
    if (track?.cover) { const image = el('img'); image.src = track.cover; image.alt = ''; node.append(image); } else node.append(el('span', '♪'));
    return node;
}
const player = new Player($('#audio'), renderPlayer, persist, notify);
window.resonaPlayer = player;
function renderPlayer() {
    const track = library.tracks.find(t => t.id === player.current);
    $('#audio-name').textContent = track?.title || 'Escolha sua primeira música';
    $('#audio-artist').textContent = track?.artist || 'Tudo começa na sua coleção.';
    const image = cover(track, true); image.id = 'now-cover'; image.setAttribute('aria-hidden', 'true'); $('#now-cover').replaceWith(image);
    const playing = !player.audio.paused;
    $('#play').textContent = playing ? 'Ⅱ' : '▶'; $('#play').setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
    $('#elapsed').textContent = time(player.audio.currentTime); $('#duration').textContent = time(player.audio.duration);
    $('#seek').max = Number.isFinite(player.audio.duration) ? player.audio.duration : 0; $('#seek').value = player.audio.currentTime || 0;
    $('#seek').disabled = !Number.isFinite(player.audio.duration);
    $('#volume').value = player.audio.volume;
    $('#shuffle').setAttribute('aria-pressed', player.shuffle);
    $('#repeat').setAttribute('aria-pressed', player.repeat !== 'off'); $('#repeat').textContent = player.repeat === 'one' ? '↻ 1' : '↻'; $('#repeat').setAttribute('aria-label', `Repetição: ${{ off: 'desligada', all: 'toda a fila', one: 'uma faixa' }[player.repeat]}`);
    $('#queue-count').textContent = player.queue.length;
    // Keep queue controls stable while playback time changes.
    const signature = JSON.stringify([player.queue, player.current, library.tracks.map(t => t.title)]);
    if (renderPlayer.signature === signature) return;
    renderPlayer.signature = signature;
    $('#queue').replaceChildren();
    for (const id of player.queue) {
        const item = library.tracks.find(t => t.id === id); if (!item) continue;
        const row = el('li'); if (id === player.current) row.setAttribute('aria-current', 'true');
        const play = button(item.title, () => player.play(id), 'queue-track'); play.append(el('small', item.artist));
        const remove = button('×', () => player.remove(id)); remove.setAttribute('aria-label', `Remover ${item.title} da fila`);
        row.append(play, remove); $('#queue').append(row);
    }
    if (!player.queue.length) $('#queue').append(el('li', 'Use + nas faixas para montar sua fila.', 'queue-empty'));
}
function currentView() { return decodeURIComponent(location.hash.slice(1) || 'library'); }
function render() {
    const view = currentView(), query = $('#search').value.toLocaleLowerCase('pt-BR');
    const playlist = library.playlists.find(p => `playlist/${p.id}` === view);
    $('#view-title').textContent = playlist?.name || ({ library: 'Sua coleção', favorites: 'Favoritos', albums: 'Álbuns', artists: 'Artistas' }[view] || 'Sua coleção');
    document.querySelectorAll('[data-view]').forEach(node => { if (node.dataset.view === view) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
    $('#playlists').replaceChildren();
    for (const item of library.playlists) { const link = el('a', item.name); link.href = `#playlist/${item.id}`; if (item === playlist) link.setAttribute('aria-current', 'page'); $('#playlists').append(link); }
    let tracks = library.tracks.filter(t => (view !== 'favorites' || t.favorite) && (!playlist || playlist.tracks.includes(t.id)) && `${t.title} ${t.artist} ${t.album}`.toLocaleLowerCase('pt-BR').includes(query));
    tracks.sort((a, b) => a[$('#sort').value].localeCompare(b[$('#sort').value], 'pt-BR'));
    $('#collection-count').textContent = `${tracks.length} ${tracks.length === 1 ? 'faixa' : 'faixas'} · ${time(tracks.reduce((sum, t) => sum + t.duration, 0))}`;
    $('#collection').replaceChildren(); $('#view-actions').replaceChildren();
    if (tracks.length) $('#view-actions').append(button('Reproduzir seleção', () => player.play(tracks[0].id, tracks.map(t => t.id)), 'primary'));
    if (playlist) $('#view-actions').append(button('Excluir playlist', async () => { try { await api(`/api/playlists/${playlist.id}`, 'DELETE'); location.hash = 'library'; await refresh(); } catch (error) { notify(error.message); } }));
    if (!tracks.length) {
        const empty = el('section', undefined, 'empty'); empty.append(el('div', '♪', 'empty-record'), el('h2', library.tracks.length ? 'Nenhuma faixa por aqui' : 'Dê espaço à sua música'), el('p', library.tracks.length ? 'Ajuste a busca ou adicione músicas a esta seleção.' : 'Abra seus arquivos ou importe uma pasta. Sua coleção fica disponível mesmo sem internet.'));
        empty.append(button('Abrir músicas', () => importAudio('files'), 'primary')); $('#collection').append(empty); return;
    }
    if (['albums', 'artists'].includes(view)) {
        const groups = new Map();
        for (const track of tracks) { const key = view === 'albums' ? `${track.album}\u0000${track.artist}` : track.artist; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(track); }
        const grid = el('div', undefined, 'album-grid');
        for (const group of groups.values()) { const card = el('article', undefined, 'album'); card.append(cover(group[0]), el('h2', view === 'albums' ? group[0].album : group[0].artist), el('p', view === 'albums' ? group[0].artist : `${group.length} faixas`), button('Reproduzir', () => player.play(group[0].id, group.map(t => t.id)))); grid.append(card); }
        $('#collection').append(grid); return;
    }
    const list = el('div', undefined, 'track-list');
    for (const track of tracks) {
        const row = el('article', undefined, 'track'); row.dataset.id = track.id;
        const play = button('▶', () => player.play(track.id, tracks.map(t => t.id)), 'track-play'); play.setAttribute('aria-label', `Reproduzir ${track.title}`);
        const info = el('div', undefined, 'track-info'); info.append(el('strong', track.title), el('span', track.artist));
        const favorite = button(track.favorite ? '♥' : '♡', async () => { try { await api(`/api/tracks/${track.id}/favorite`, 'PUT', { favorite: !track.favorite }); track.favorite = !track.favorite; render(); } catch (error) { notify(error.message); } }); favorite.setAttribute('aria-label', `Favoritar ${track.title}`); favorite.setAttribute('aria-pressed', track.favorite);
        const enqueue = button('+', () => { player.enqueue(track.id); notify('Faixa adicionada à fila.'); }); enqueue.setAttribute('aria-label', `Adicionar ${track.title} à fila`);
        const actions = el('details', undefined, 'track-menu'); const summary = el('summary', '•••'); summary.setAttribute('aria-label', `Mais ações para ${track.title}`); actions.append(summary);
        const menu = el('div', undefined, 'menu');
        for (const item of library.playlists) menu.append(button(`Adicionar a ${item.name}`, async () => { try { await api('/api/playlists', 'PUT', { ...item, tracks: [...new Set([...item.tracks, track.id])] }); await refresh(); notify('Faixa adicionada à playlist.'); } catch (error) { notify(error.message); } }));
        if (playlist) menu.append(button('Remover da playlist', async () => { try { await api('/api/playlists', 'PUT', { ...playlist, tracks: playlist.tracks.filter(id => id !== track.id) }); await refresh(); } catch (error) { notify(error.message); } }));
        menu.append(button('Remover da coleção', async () => { try { await api(`/api/tracks/${track.id}`, 'DELETE'); player.remove(track.id); await refresh(); notify('Removida da coleção. O arquivo original foi preservado.'); } catch (error) { notify(error.message); } })); actions.append(menu);
        row.append(play, cover(track, true), info, el('span', track.album, 'track-album'), el('span', time(track.duration), 'track-duration'), favorite, enqueue, actions); list.append(row);
    }
    $('#collection').append(list);
}
async function refresh() { library = await api('/api/library'); render(); renderPlayer.signature = null; renderPlayer(); }
async function importAudio(kind, files) {
    if (importing) return;
    if (!window.resona) { notify('Abra o Resona pelo aplicativo desktop para importar os arquivos originais.'); return; }
    importing = true; $('#import-files').disabled = true; $('#import-folder').disabled = true; notify('Lendo os arquivos e organizando sua coleção…');
    try {
        const result = files ? await window.resona.importDrop(Array.from(files)) : await (kind === 'folder' ? window.resona.chooseFolder() : window.resona.chooseFiles());
        await refresh(); notify(`${result.imported} adicionadas; ${result.skipped} já estavam na coleção.${result.errors.length ? ' ' + result.errors.slice(0, 3).join(' ') : ''}`);
    } catch (error) { notify(error.message); }
    finally { importing = false; $('#import-files').disabled = false; $('#import-folder').disabled = false; }
}
$('#import-files').onclick = () => importAudio('files'); $('#import-folder').onclick = () => importAudio('folder');
$('#search').addEventListener('input', render); $('#sort').addEventListener('change', render);
window.addEventListener('hashchange', () => { $('#search').value = ''; render(); });
$('#queue-toggle').onclick = () => { const hidden = $('#queue-panel').classList.toggle('closed'); $('#queue-toggle').setAttribute('aria-expanded', !hidden); document.body.classList.toggle('queue-closed', hidden); };
$('#queue-close').onclick = () => $('#queue-toggle').click();
const compactWindow = matchMedia('(max-width:1150px)');
function adaptQueue() { if (compactWindow.matches && !$('#queue-panel').classList.contains('closed')) $('#queue-toggle').click(); }
compactWindow.addEventListener('change', adaptQueue); adaptQueue();
$('#clear-queue').onclick = () => player.clear(); $('#play').onclick = () => player.toggle(); $('#next').onclick = () => player.advance(); $('#previous').onclick = () => player.previous();
$('#shuffle').onclick = () => { player.shuffle = !player.shuffle; player.cycle = new Set(player.current ? [player.current] : []); player.update(); };
$('#repeat').onclick = () => { player.repeat = { off: 'all', all: 'one', one: 'off' }[player.repeat]; player.update(); };
$('#seek').oninput = () => { if (Number.isFinite(player.audio.duration)) player.audio.currentTime = Number($('#seek').value); };
$('#volume').oninput = () => { player.audio.volume = Number($('#volume').value); persist(); };
$('#new-playlist').onclick = () => { $('#playlist-name').value = ''; $('#playlist-dialog').showModal(); };
$('#cancel-playlist').onclick = () => $('#playlist-dialog').close();
$('#playlist-form').onsubmit = async event => { event.preventDefault(); const name = $('#playlist-name').value.trim(); if (!name) return; try { const result = await api('/api/playlists', 'PUT', { name, tracks: [] }); $('#playlist-dialog').close(); location.hash = `playlist/${result.id}`; await refresh(); } catch (error) { notify(error.message); } };
$('#shortcuts').onclick = () => $('#shortcuts-dialog').showModal();
document.addEventListener('dragover', event => { event.preventDefault(); });
document.addEventListener('drop', event => { event.preventDefault(); if (event.dataTransfer.files.length) importAudio('files', event.dataTransfer.files); });
document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.key.toLowerCase() === 'o') { event.preventDefault(); importAudio('files'); return; }
    if (event.target.closest?.('input, textarea, select, button, summary, [contenteditable="true"], dialog')) return;
    if (event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space') { event.preventDefault(); player.toggle(); }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); if (event.altKey) event.key === 'ArrowRight' ? player.advance() : player.previous(); else if (Number.isFinite(player.audio.duration)) player.audio.currentTime = Math.max(0, Math.min(player.audio.duration, player.audio.currentTime + (event.key === 'ArrowRight' ? 5 : -5))); }
    else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); player.audio.volume = Math.min(1, Math.max(0, player.audio.volume + (event.key === 'ArrowUp' ? 0.05 : -0.05))); renderPlayer(); persist(); }
});
if ('mediaSession' in navigator) {
    for (const [action, handler] of Object.entries({ play: () => player.toggle(), pause: () => player.audio.pause(), previoustrack: () => player.previous(), nexttrack: () => player.advance(), seekbackward: () => { player.audio.currentTime = Math.max(0, player.audio.currentTime - 5); }, seekforward: () => { if (Number.isFinite(player.audio.duration)) player.audio.currentTime = Math.min(player.audio.duration, player.audio.currentTime + 5); } })) navigator.mediaSession.setActionHandler(action, handler);
    player.audio.addEventListener('play', () => { const track = library.tracks.find(t => t.id === player.current); if (track) navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.album }); });
}
try { await refresh(); player.restore(library.preferences, library.tracks); } catch { notify('Não foi possível abrir a coleção. Reinicie o Resona para tentar novamente.'); }

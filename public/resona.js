const notify = (text) => {
    const notice = document.querySelector('#notice');
    notice.textContent = text;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { notice.textContent = ''; }, 4000);
};
document.querySelectorAll('[data-save]').forEach(button => {
    button.addEventListener('click', async () => {
        button.disabled = true;
        try {
            const response = await fetch(`/library/tracks/${encodeURIComponent(button.dataset.save)}`, {
                method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content, 'Accept': 'application/json' },
            });
            if (!response.ok) throw new Error('Falha ao salvar');
            const result = await response.json();
            document.querySelectorAll(`[data-save="${button.dataset.save}"]`).forEach(b => {
                b.setAttribute('aria-pressed', String(result.saved));
                b.textContent = result.saved ? '♥' : '♡';
            });
            notify(result.saved ? 'Faixa guardada na biblioteca.' : 'Faixa removida da biblioteca.');
            if (location.pathname === '/library' && !result.saved) location.reload();
        } catch { notify('Não foi possível atualizar a biblioteca. Tente novamente.'); }
        finally { button.disabled = false; }
    });
});
const audio = document.querySelector('#audio');
let objectUrl;
document.querySelectorAll('input[type="file"]').forEach(input => input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    document.querySelector('#audio-name').textContent = file.name;
    document.querySelector('#audio-status').textContent = 'Arquivo local · permanece no seu dispositivo';
    try { await audio.play(); } catch { notify('Não foi possível tocar o arquivo. Verifique o formato e tente o botão de reprodução.'); }
}));
audio.addEventListener('error', () => notify('Este arquivo não pôde ser reproduzido. Escolha outro formato de áudio.'));
window.addEventListener('beforeunload', () => { if (objectUrl) URL.revokeObjectURL(objectUrl); });

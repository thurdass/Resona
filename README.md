# Resona

Player de músicas locais para desktop Linux. Abra o aplicativo, importe arquivos
ou pastas e escolha uma faixa para reproduzir. Funciona offline, sem contas,
streaming, telemetria ou recursos remotos obrigatórios.

## Executar

Desenvolvimento: PHP 8.3+ (PDO SQLite, mbstring, fileinfo, DOM/XML, tokenizer,
OpenSSL), Composer, Node 22.12+ e npm; sessão gráfica e bibliotecas do Electron.

```bash
composer run setup
./bin/resona
```

O Electron inicia e encerra o Laravel em uma porta livre de `127.0.0.1`.
`RESONA_PHP` seleciona outro executável PHP; `RESONA_DATA_DIR` seleciona um
perfil separado (caminho absoluto). CSS, JavaScript e DejaVu Sans são locais,
sem Vite ou downloads durante o uso.

## Sua coleção

- **Abrir músicas** seleciona vários arquivos; **Importar pasta** percorre
  subpastas. Arraste arquivos sobre a janela para importar.
- Importar não inicia áudio. Clique em uma faixa ou em **Reproduzir seleção**.
- Coleção, favoritos, álbuns, artistas e playlists usam os arquivos importados.
  Busque por título, artista ou álbum e ordene a lista.
- **+** adiciona à fila; **×** remove da fila. O menu **•••** inclui ações de
  playlist e remoção da coleção. Remover nunca apaga o arquivo original.
- Transporte inferior: pausa, anterior, próxima, posição, volume, aleatório e
  repetição desligada / toda a fila / uma faixa. Navegação preserva o mesmo áudio.
- Biblioteca, playlists, favoritos, volume, repetição, aleatório e fila persistem
  em SQLite em `~/.config/Resona/library.sqlite` (ou `$XDG_CONFIG_HOME/Resona`).
  Ao reabrir, a reprodução aguarda ação explícita. A posição não é restaurada.
- O importador referencia caminhos canônicos e evita duplicatas por caminho;
  cópias em locais distintos são itens distintos. Links simbólicos são ignorados
  na importação para evitar ciclos e atravessamento inesperado de pastas.
- getID3 lê tags e capas (JPEG/PNG/WebP até 5 MiB). Campos ausentes recebem nomes
  legíveis e capa substituta. Não há edição de tags nem cópia das músicas.
- Formatos oferecidos: MP3, FLAC, WAV, Ogg, Opus, M4A, AAC, AIFF e WebM.
  Decodificação depende do codec suportado pelo Electron; falhas indicam ação
  útil e a fila procura outra faixa, sem repetição infinita de arquivos inválidos.
  Arquivos movidos precisam ser importados na localização atual.

Atalhos: Espaço pausa/reproduz; ←/→ busca 5 s; ↑/↓ ajusta volume;
Alt+←/→ muda de faixa; Ctrl+O abre músicas. Controles e campos mantêm seu
comportamento próprio ao receber foco. A janela permite abrir/fechar a fila,
mostra foco e respeita movimento reduzido.

## Arquitetura e limites de acesso

Laravel/PHP centraliza metadados e persistência; SQLite elimina dependência de
sessões HTTP. Electron mantém renderer isolado, sandbox habilitado e três
operações na ponte: escolher arquivos, escolher pasta e importar objetos File
recebidos por arraste. O processo principal autoriza a importação com segredo
aleatório por execução; o renderer nunca recebe esse segredo nem caminhos.
Áudio e capas usam IDs da biblioteca; não há rota pública de leitura por caminho.
As mutações da interface exigem CSRF. Pedidos externos e permissões do renderer
são bloqueados. O serviço PHP atende apenas loopback; não é um servidor público.

Um único elemento de áudio vive fora das telas, renderizadas no mesmo documento.
NativePHP não está instalado: sua documentação v2 indica PHP 8.3+, Laravel 11+,
Node 22+ e Linux, mas usa Electron e não demonstrou vantagem que justificasse
migrar o shell existente. Veja [instalação oficial](https://nativephp.com/docs/desktop/2/getting-started/installation).

## Pacote Linux x64

```bash
npm run package:linux
tar -xzf dist/resona-linux-x64.tar.gz
./resona-linux-x64/resona
```

O arquivo contém Electron 44.9.1, código Laravel, dependências de produção,
fontes e PHP 8.3.31 estático com SQLite e extensões necessárias. Não requer PHP,
Composer ou Node instalados no computador de destino. Ainda requer bibliotecas
gráficas/áudio do Linux e sandbox Chromium funcional. É um diretório portátil
compactado, sem instalador DEB/AppImage ou atualização automática.

O build baixa PHP do projeto oficial `NativePHP/php-bin`, fixado por commit e
SHA-256 no empacotador, e verifica as extensões. A primeira construção precisa de
rede ou caches preenchidos; o aplicativo instalado não. Os originais e o perfil
do desenvolvedor não entram no pacote. O diretório `dist/` não é versionado.

O pacote foi extraído e executado em `/tmp`, usando seu PHP embarcado, com o
mesmo smoke da árvore de desenvolvimento. O teste configura proxy externo sem
serviço e exceção para loopback; isso simula indisponibilidade externa sem mudar
a rede do host. Não é uma certificação de compatibilidade com todas as distros.

## Verificação

```bash
php artisan test --compact
npm run test:desktop
RESONA_SMOKE_OUTPUT=/tmp/resona-smoke xvfb-run -a npm run desktop:smoke -- --no-sandbox --ozone-platform=x11
```

Os testes PHP cobrem importação real, UTF-8, duplicatas, arquivos inválidos e
removidos, autorização, ranges, favoritos, playlists, preferências e preservação
dos originais. Node verifica persistência após reiniciar o servidor, CSRF e regras
de fila. O smoke usa FFmpeg para gerar WAV/FLAC sintéticos, exercita Electron,
ponte de arraste com File real, controles, continuidade, término natural,
persistência, erros e duas dimensões de janela; grava capturas e `results.json`.
A seleção do diálogo é automatizada no smoke; não comprova interação humana com
o seletor do sistema. Estado do elemento, decodificação e avanço do tempo são
verificados; saída audível não é confirmada.

Neste host, o sandbox Chromium não está configurado para a sessão virtual.
`--no-sandbox` é explícito e restrito ao comando de teste acima; o Resona não o
ativa automaticamente. A execução Linux normal exige suporte ao sandbox Chromium
na distribuição. Não alteramos configurações globais ou permissões SUID.

O catálogo em `resources/catalog/demo.php` é fixture histórica, sem rotas de
produto. Evidências anteriores de Spotify em `docs/rea` permanecem históricas;
a investigação atual usa o próprio Electron/Resona. Nenhum recurso do Spotify
é incluído no aplicativo.

Evidências da entrega local: [docs/rea/local-player.md](docs/rea/local-player.md).

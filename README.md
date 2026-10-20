# Resona

Aplicativo desktop Linux com PHP 8.3+, Laravel 13 e shell Electron. Início,
busca por faixas/artistas/álbuns, páginas de entidades e biblioteca com faixas
salvas, filtro e ordenação. Identidade própria e catálogo fictício local.

## Executar

Requisitos: PHP 8.3+ com extensões exigidas pelo Composer (incluindo mbstring,
DOM/XML e SQLite para os testes padrão), Composer, Node.js 22.12+ e npm,
sessão gráfica Linux e bibliotecas de runtime do Electron/Chromium.

```bash
composer run setup
./bin/resona
```

O shell inicia e encerra seu próprio servidor PHP em `127.0.0.1`, numa porta
livre. A biblioteca fica em sessões de arquivo no diretório de dados do Electron
(`~/.config/Resona` por padrão); chave e cookies persistem entre execuções.
Não precisa de servidor externo ou banco para os fluxos de música.
Use `RESONA_PHP=/caminho/php` para selecionar outro executável PHP.

Para desenvolvimento no navegador: `composer run dev`, acessando o endereço
local exibido. As sessões do navegador são independentes das sessões desktop.
CSS e JavaScript são servidos diretamente; não há build Vite.

Neste host, o helper SUID do Electron não está configurado e a execução padrão
aborta antes de abrir a janela. O teste visual foi executado em Xvfb/X11 com
`--no-sandbox`; isso não valida o sandbox de produção. A distribuição desktop
precisa configurar o sandbox Chromium conforme a política da distribuição Linux.
Para reproduzir estritamente o teste em sessão virtual:

```bash
RESONA_SMOKE_OUTPUT=/tmp/resona-smoke xvfb-run -a npm run desktop:smoke -- --no-sandbox --ozone-platform=x11
```

`--no-sandbox` reduz o isolamento do Chromium e não é ativado automaticamente
pelo Resona. O aplicativo exige instalação local das dependências; ainda não
há AppImage, pacote DEB ou PHP embarcado.

## Catálogo e áudio

Os três artistas, três álbuns e nove faixas são fictícios, definidos em
`resources/catalog/demo.php`. Os corações adicionam/removem faixas da biblioteca.
O player inferior abre arquivos de áudio locais sem upload. As faixas demo
não têm gravações; não há streaming ou integração com contas do Spotify.
A reprodução de áudio local termina ao navegar para outra página nesta versão.

## Investigação e rastreabilidade

Consulte [docs/rea/README.md](docs/rea/README.md) para os hashes, Evidence IDs,
achados estáticos, hipóteses, bloqueios de runtime e a relação com cada fluxo.
O MCP REA analisou os recursos empacotados do Spotify; sua UI não foi observada
em execução. Cores, geometria e composição visual são decisões próprias.
Nenhum código, fonte, imagem ou gravação do Spotify é usado pelo aplicativo.

## Verificação

```bash
php artisan test
npm run test:desktop
```

Os testes cobrem navegação, relações, busca/categorias/estados vazios, validação,
escape HTML, salvar/remover/filtrar/ordenar, persistência após reiniciar o servidor
desktop e rejeição de POST sem CSRF. O smoke gráfico testa o DOM real no Electron,
busca, coração e biblioteca e grava capturas; ele exige sessão gráfica ou Xvfb.

## Direção do produto

O desenvolvimento atual substitui o catálogo demonstrativo por uma coleção de
arquivos reais, persistência local, fila e reprodução contínua. A descrição acima
registra a referência anterior; cada entrega atualizará os fluxos disponíveis.

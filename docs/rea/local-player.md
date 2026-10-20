# Resona local: evidência da entrega

2026-10-20. Alvo: Resona 0.1.0, Electron 44.9.1 / Chromium 152.0.7977.167,
Linux x64. Nenhuma investigação nova do Spotify.

## Perguntas, métodos e decisões

1. **Quais garantias de isolamento o Electron distribuído oferece por padrão?**
   REA `inspect_electron_fuses`, Evidence
   `ev_30fb08a1a481408d4ab69fc5015e6d57d4eae2e7bfd9da02f17fc54b8717a31c`.
   ELF SHA-256 `3ba9114b7fbaafaf548f72c5d1bc86b7dc81098a85361784359c2c1199625bfc`.
   Observado estaticamente: RunAsNode e Inspector habilitados; OnlyLoadAppFromAsar
   e integridade ASAR desabilitados. Isso não prova Inspector ativo nem isolamento
   em execução. Decisão: não presumir proteção de recursos pelo empacotador;
   manter contextIsolation/sandbox, negar permissões, restringir origem e expor
   somente seleção/importação na ponte. Sem inspeção do processo main ou alteração
   de fuses neste trabalho.

2. **O pacote fora do repositório carrega a interface e seus recursos locais?**
   REA `list_browser_targets` e `inspect_web_page`, Evidence
   `ev_08cc46abb125790513d1e9db50c7a0f8a4860463299988ffa794d51142990eb7`.
   Observado: documento, módulos player/resona, CSS, SVG, fonte TTF e capa PNG
   em loopback; árvore acessível com controles nomeados e favoritos persistidos.
   Janela passiva de 300 ms, sem eventos anteriores à conexão. Ausência de eventos
   nessa janela não prova ausência de tráfego durante toda a execução. O registro
   de cabeçalhos motivou revisar CORS; a configuração final desabilita CORS e
   aceita apenas hosts loopback, com testes HTTP de regressão.

3. **Navegar troca o documento inteiro?**
   REA executou cliques declarados em Álbuns e Coleção no pacote extraído.
   Evidence `ev_4744cac1aaec01bdf4cc0d2d6bc1c38da034c1cbf8508444a9bf758de52ae33b`:
   ações concluídas, URLs `#albums`/`#library`, um navigation entry do documento
   inicial. Não apareceu nova requisição de documento nos cliques observados.
   Provedor marcou a captura geral incompleta em `events`; não usar como prova
   universal de ausência de tráfego ou de continuidade sonora. A primeira tentativa
   (`ev_8372…`) falhou por seletor ambíguo entre marca e navegação; foi corrigido
   para `data-view`. Decisão própria: manter navegação no documento e separar o
   objeto Player do conteúdo das telas. O smoke abaixo verifica continuidade real.

O CDP não fornece hash do executável; a associação com o pacote é evidência do
lançamento controlado pelo operador, não um digest atestado pelo REA. A captura
foi feita no primeiro pacote antes do ajuste final de CORS/hosts; o pacote final
foi novamente validado pelo smoke. REA desconectou do navegador externo e a
instância de validação foi encerrada separadamente. Nenhuma sessão nativa foi aberta.
Registros completos: [local-player-evidence.json](local-player-evidence.json).

## Validação própria do produto

Referência anterior: 3 testes PHP/52 asserções e 1 Node. Agora: 6 PHP/44 asserções
(incluindo permissões reais de arquivo) e 6 Node aprovados. Pint aprovado.
A skill `testing-best-practices` referida nas instruções antigas não foi encontrada
nos diretórios de skills disponíveis; foram seguidas as regras PHPUnit do projeto.

Smoke Electron com WAV/FLAC de 16 segundos gerados por FFmpeg e capa sintética:
seleção múltipla (resultado do diálogo automatizado), importação recursiva,
deduplicação, File real entregue por arraste à ponte, capa decodificada, reprodução,
pausa, posição, volume, término natural, fila, navegação, favorito, playlist,
restauração sem autoplay (inclusive faixa removida), digitação, janela compacta e arquivo removido. O teste
real usa Chromium para o áudio; testes unitários da fila não são a única evidência.
Tempo real passou de 0,490 s a 0,896 s durante navegação, mesmo ID, readyState 4,
duração 16 s. Saída audível **não verificada**. Console sem erros relevantes.

Rede externa simulada indisponível por proxy em `127.0.0.1:1`, com bypass direto
apenas para loopback; a configuração foi verificada antes dos fluxos. Não houve
mudança na rede do host. Isso valida o aplicativo sem serviços externos, não uma
queda física da interface de rede. Capturas revisadas em 1280×850 e 680×650;
fila compacta recolhida e acentos WAV corrigidos após revisão visual.

- [Resultados do pacote final](local-player-smoke.json)
- [Coleção](local-player-collection.png)
- [Janela compacta](local-player-compact.png)

## Distribuição e limites

`npm run package:linux` gera `dist/resona-linux-x64.tar.gz`, com PHP estático
8.3.31 de NativePHP/php-bin, sem migrar o aplicativo para NativePHP.
Arquivo PHP de origem fixado no commit `e0c212d36422e5aa1f7357ec0524d99de8ee79bf`,
SHA-256 do ZIP `aeec695114d1d7a88e2a9aafd1a6ecb2388a1b61bdb17ec2a3294fe480936c91`.
SHA-256 do PHP extraído: `7b4bdd6c27bf76789f718dafcbfeea5cd538ad48ad1e67c12aa053b11ecdd1c2`.
SHA-256 do tar validado: `c253fa4f022c2f8f596940a500aebf1b6e97bd81d8f3432feede834233c121f8`.

Pacote final extraído em `/tmp/resona-delivery-verified` e executado com seu PHP embarcado,
sem servidor de desenvolvimento, Composer ou Node externos. O smoke exige FFmpeg
como ferramenta de teste; o produto não usa FFmpeg durante o uso.

A abertura padrão do pacote foi tentada e abortou (exit 133): helper SUID do
sandbox sem proprietário/permissões exigidos neste host. O smoke usou Xvfb com
`--no-sandbox` explícito; **sandbox de produção não validado**. O aplicativo e o
launcher não acrescentam essa opção. Não mudamos SUID, AppArmor ou configurações
globais. Compatibilidade entre distribuições, integração MPRIS efetiva com o
ambiente desktop, saída audível e interação humana com o diálogo nativo permanecem
sem confirmação. O pacote portátil não é DEB/AppImage e não foi publicado.

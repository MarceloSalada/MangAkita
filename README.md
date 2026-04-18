# MangAkita

MangAkita é um reader experimental focado em **Comic Walker**, com arquitetura orientada a:

`probe -> manifest -> reader`

## Objetivo

Validar um fluxo limpo, Comic Walker-first, para:

1. observar o viewer real
2. capturar candidatos de páginas
3. gerar um manifesto local
4. abrir o capítulo no reader
5. só depois evoluir para OCR e tradução

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Playwright

## Diretriz de arquitetura

Este repositório nasce focado **somente em Comic Walker**.

Não há suporte legado a Nico Nico, DRM hash, descramble, blob reconstruction ou outras hipóteses da fase anterior, exceto se uma necessidade concreta do Comic Walker justificar isso futuramente.

## Estrutura principal

- `/reader` — abre o manifesto local do episódio
- `/import` — ponto de entrada para informar a URL alvo
- `/status` — estado atual do projeto
- `/audit` — auditoria das páginas promovidas e rejeitadas
- `tools/comicwalker-probe.mjs` — probe real do viewer
- `public/manifests/<episodeId>.json` — manifesto local

## Execução prática

### Rodar a interface no Codespaces ou local

1. instalar dependências
2. rodar o modo de desenvolvimento do Next.js
3. abrir `/import`, `/reader`, `/audit` e `/status`

Comandos:

```bash
npm install
npm run dev
```

### Rodar o probe real no Codespaces ou local

O probe real depende de Playwright + Chromium. O fluxo prático é:

```bash
npm install
npm run probe:viewer:install
npm run probe:comicwalker -- "https://comic-walker.com/detail/KC_008566_S/episodes/KC_0085660000200011_E"
```

Saídas esperadas:

- `debug/<episodeId>/comicwalker-probe-report.json`
- `public/manifests/<episodeId>.json`

Depois disso, abra:

- `/reader?episodeId=<episodeId>`
- `/audit?episodeId=<episodeId>`
- `/status?episodeId=<episodeId>`

## O que falta para uso prático completo

1. confirmar build e execução do app em ambiente real
2. validar o probe real no Codespaces com Playwright/Chromium
3. gerar pelo menos um manifesto real utilizável
4. testar o ciclo completo:
   - import
   - probe
   - manifesto
   - reader
   - audit
   - status
5. continuar refinando a heurística que separa páginas reais de assets do site

## Estado atual esperado

O próximo objetivo técnico do projeto é isolar **somente as páginas reais do capítulo**, sem misturar:

- sprites
- badges
- logos
- SVGs de interface
- imagens promocionais

## Próximas prioridades

1. enriquecer a classificação de candidatos a página
2. encontrar um payload/JSON mais confiável do viewer
3. validar melhor `units[]` antes de renderizar no reader
4. consolidar o fluxo prático Codespaces/local → manifesto → reader

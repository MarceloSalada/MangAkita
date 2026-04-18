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
- `tools/comicwalker-probe.mjs` — probe real do viewer
- `public/manifests/<episodeId>.json` — manifesto local

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

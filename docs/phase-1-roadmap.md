# Fase 1 — Trazer o capítulo para dentro do reader

## Objetivo da fase

Chegar ao ponto em que o projeto consiga:

1. abrir a URL de um episódio Comic Walker
2. rodar o probe real
3. gerar um manifesto utilizável
4. carregar esse manifesto no reader
5. renderizar página por página até o fim do capítulo

Nesta fase, **OCR e tradução ainda não são o objetivo principal**.

---

## O que já existe

- app Next.js com `/import`, `/reader`, `/audit` e `/status`
- proxy de imagem
- probe real com Playwright
- manifesto local em `public/manifests`
- auditoria de páginas promovidas e rejeitadas
- score com sinais de:
  - nome do arquivo
  - path
  - batchKey
  - lote dominante
  - requestOrder
  - responseOrder
  - resourceType

---

## O que falta para a Fase 1 funcionar de verdade

### 1. Validar o ambiente de execução real

Precisamos confirmar no Codespaces/local:

- `npm install`
- `npm run dev`
- `npm run probe:viewer:install`
- `npm run probe:comicwalker -- "<url>"`

Sem isso, a arquitetura existe, mas o fluxo real ainda não foi validado ponta a ponta.

### 2. Gerar um manifesto real utilizável

Hoje o projeto já está pronto para consumir um manifesto, mas a Fase 1 só fecha quando o probe gerar um manifesto real que contenha:

- a maioria ou totalidade das páginas do capítulo
- pouca ou nenhuma contaminação por assets de interface
- ordem coerente de leitura

### 3. Confirmar completude do capítulo

Mesmo depois de gerar um manifesto, ainda precisamos validar:

- se a primeira página veio
- se a última página veio
- se não há furos no meio
- se a ordem visual está correta
- se não houve repetição ou páginas faltando

### 4. Refinar a seleção de páginas reais

A maior pendência técnica da Fase 1 continua sendo esta:

- separar páginas reais do capítulo
- excluir logos, badges, sprites, promoções e outros assets

O projeto já avançou muito nisso, mas ainda precisa de validação com manifesto real.

### 5. Confirmar o ciclo completo no reader

A fase só termina quando o seguinte ciclo for confirmado na prática:

- URL do episódio
- probe
- manifesto
- reader abrindo todas as páginas corretas
- auditoria mostrando coerência entre promovidos e rejeitados

---

## Critério de pronto da Fase 1

A Fase 1 pode ser considerada pronta quando:

- um episódio real do Comic Walker for processado
- o manifesto tiver páginas suficientes e corretas
- o reader conseguir exibir o capítulo até o fim
- a auditoria mostrar que a maior parte do que foi promovido pertence ao lote dominante correto
- os rejeitados forem principalmente assets e ruído

---

## O que vem depois: OCR e tradução

Somente depois de a Fase 1 estar estável faz sentido avançar para:

### Fase 2 — OCR por página

Objetivo:

- selecionar uma página
- rodar OCR sobre a imagem final renderizada
- extrair blocos de texto com posição aproximada

Pendências futuras:

- escolher engine de OCR
- definir se o OCR roda no servidor ou localmente
- lidar com texto vertical, balões e ruído de arte

### Fase 3 — Tradução

Objetivo:

- traduzir o texto extraído
- armazenar resultado por página
- exibir original + tradução

### Fase 4 — Overlay visual

Objetivo:

- desenhar caixas/labels sobre a página
- permitir alternar entre original e tradução
- futuramente substituir ou sobrepor texto nos balões

---

## Próximos passos recomendados

### Bloco A — Fechar a Fase 1

1. validar o app no Codespaces/local
2. rodar o probe real para um episódio
3. gerar manifesto real
4. abrir no reader
5. auditar lote dominante, promovidos e rejeitados
6. ajustar heurística até o capítulo ficar navegável até o final

### Bloco B — Preparar OCR

Só depois disso:

1. definir pipeline de OCR
2. definir estrutura de dados para blocos de texto por página
3. criar tela simples de inspeção OCR por página

---

## Resumo operacional

Hoje o projeto já está mais perto de um reader funcional do que de um tradutor.

A prioridade correta é:

**fazer o reader carregar um capítulo real do início ao fim com manifesto confiável**.

Depois disso, OCR e tradução deixam de ser hipótese e passam a ser extensão natural do pipeline.

# Homologação E2E (Playwright) — TASK-S06-06

Suíte de ponta a ponta das 5 jornadas críticas do MVP NetProfissional, rodando
contra o backend real + Postgres/Redis, sobre o tenant de homologação
(`e2e.netprofissional.test`).

## Pré-requisitos (uma vez por máquina)

```bash
cd frontend
yarn install
yarn playwright install chromium   # baixa o navegador (~120 MB)
```

> Se aparecer `browserType.launch: Executable doesn't exist ...`, o cache do
> navegador sumiu (limpeza de `~/.cache`). Rode `yarn playwright install chromium`
> de novo.

## Antes de cada rodada

Só é preciso:

1. **Postgres e Redis no ar** e `backend/.env` preenchido
   (`DATABASE_URL`, `REDIS_URL`, `SEED_E2E_PASSWORD`, `SEED_E2E_WEBHOOK_TOKEN`,
   `SEED_E2E_INVITE_TOKEN`).

Não precisa subir o backend nem o frontend à mão, nem exportar o `.env` no
shell: o Playwright sobe **os dois servidores** automaticamente (`webServer` na
config) e a suíte carrega `backend/.env` sozinha (`e2e/support/load-env.ts`). Se
algum já estiver no ar na porta certa, ele é reaproveitado.

## Rodar

```bash
cd frontend
yarn e2e            # headless, as 13 verificações
yarn e2e:headed     # abre o navegador na tela (vê os cliques acontecendo)
yarn e2e:ui         # modo interativo (UI do Playwright)
yarn e2e:report     # abre o último relatório HTML
```

Para rodar individualmente os quatro fluxos administrativos, em velocidade
reduzida e com saída do terminal guardada por caso:

```bash
python3 scripts/run-admin-usability.py
```

O runner chama o Playwright uma vez por fluxo. Cada execução reaplica a seed
somente no tenant E2E dedicado. Os vídeos, relatórios e logs ficam em
`test-results/admin-usability/` na raiz do repositório; cada caso tem um atalho
`video.webm` além dos artefatos completos. `E2E_SLOWMO` pode ajustar a velocidade
(padrão: 400 ms entre ações).

Para rodar individualmente os fluxos do Vendedor:

```bash
python3 scripts/run-seller-usability.py
```

Os logs, vídeos e relatórios dessa rodada ficam em
`test-results/seller-usability/<execução>/`, com um `video.webm` direto na pasta
de cada caso.

Para rodar individualmente os fluxos do Captador:

```bash
python3 scripts/run-captador-usability.py
```

Os logs, vídeos e relatórios dessa rodada ficam em
`test-results/captador-usability/<execução>/`, com um `video.webm` direto na
pasta de cada caso.

Para acompanhar os cliques a olho nu, use câmera lenta:

```bash
E2E_SLOWMO=600 yarn e2e:headed
```

O `webServer` sobe Nest e Vite. A porta da API vem de `PORT` em `backend/.env`
(ou de `E2E_API_URL`), e o frontend recebe essa mesma URL em `VITE_API_URL`.
O `global-setup` confere `/health` e reaplica a seed E2E antes da suíte.

## Jornadas cobertas

| Arquivo | Jornada |
|---|---|
| `journey-1-auth-invite.spec.ts` | Login (bloqueado recusado, admin entra), convite, ativação por token |
| `journey-2-manual-lead.spec.ts` | Cadastro manual PJ e lead no Pool |
| `journey-3-assume-pipeline.spec.ts` | Vendedor assume lead, abre Kanban e edita termos |
| `journey-4-loss-dashboard.spec.ts` | Vendedor registra perda com motivo; Admin vê dashboard |
| `journey-5-webhook.spec.ts` | Webhook HMAC (assinatura válida aceita, inválida 401) |
| `journey-seller-usability.spec.ts` | Dashboard, Lista, mudança de etapa, nota e devolução ao Pool |
| `journey-admin-usability.spec.ts` | Convites, atribuição no Pool, Lista do funil e bloqueio com transferência |
| `journey-captador-usability.spec.ts` | Dashboard, esteira de captações, cadastro manual e escopo do menu |

## Observações

- Seletores usam rótulos acessíveis (`getByRole`/`getByLabel`), não `data-testid`.
- A suíte roda sequencial (`workers: 1`): as jornadas compartilham o tenant de
  homologação e a seed garante o estado inicial.
- Os artefatos (`test-results/`, `playwright-report/`) são ignorados pelo git.
- Esta suíte **não** faz parte do gate `onp-spec` (que roda só os unitários via
  `scripts/run-tests.mjs`): o E2E exige serviços no ar e roda à parte.

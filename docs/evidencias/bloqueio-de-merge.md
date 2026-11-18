# Evidência: o quality gate bloqueia o merge quando um teste obrigatório falha

**Data:** 03/11/2026
**PR de evidência:** <https://github.com/Ev-maers/resolveai-testes/pull/8>
(fechado sem merge; branch `test/evidencia-bloqueio-merge`, commit `7170204`)
**Captura de tela:** `bloqueio-de-merge-pr8.jpg`

## O que foi feito

1. A proteção da branch `main` foi ativada em *Settings → Branches* com os
   checks `quality-gate / unit-and-api` e `quality-gate / smoke-e2e` como
   obrigatórios e revisão aprovada obrigatória.
2. Uma branch quebrou de propósito o teste unitário U1
   (`tests/unidade/oraculo.test.js`, esperando 17 pares em vez de 16).
3. O PR #8 foi aberto contra `main`. O check `quality-gate / unit-and-api`
   reprovou; `quality-gate / smoke-e2e` passou.
4. A página do PR mostrou **"Merging is blocked"** e o botão
   *Merge pull request* desabilitado para uma conta com permissão de escrita.
5. O PR foi fechado sem merge e a branch apagada.

## Resposta da API do GitHub

`GET /repos/Ev-maers/resolveai-testes/branches/main`:

```json
{
  "protected": true,
  "protection": {
    "enabled": true,
    "required_status_checks": {
      "enforcement_level": "non_admins",
      "contexts": [
        "quality-gate / smoke-e2e",
        "quality-gate / unit-and-api"
      ]
    }
  }
}
```

`GET /repos/Ev-maers/resolveai-testes/commits/7170204/check-runs`
(execução do evento `pull_request`, run 41740588476):

| Check | Conclusão | Obrigatório? |
| :--- | :--- | :--- |
| `quality-gate / unit-and-api` | **failure** | sim |
| `quality-gate / smoke-e2e` | success | sim |
| `regression / full-suite` | skipped (só roda agendado ou manual) | não |

Links das execuções:

- <https://github.com/Ev-maers/resolveai-testes/actions/runs/41740588476/job/126280793927>
  (unit-and-api, reprovado)
- <https://github.com/Ev-maers/resolveai-testes/actions/runs/41740588476/job/126280793455>
  (smoke-e2e, aprovado)

## Ressalva

O nível de aplicação registrado pela API é `non_admins`: o dono do repositório
ainda pode contornar a regra. Para fechar essa brecha, marcar
**Do not allow bypassing the above settings** na regra da branch.

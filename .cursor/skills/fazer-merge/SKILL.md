---
name: fazer-merge
description: Cria o pull request da branch atual contra main e faz o merge. Invocável com /fazer-merge.
disable-model-invocation: true
---

# Fazer merge — FinanceFlow

## Objetivo

Ao invocar `/fazer-merge`, abrir (ou reutilizar) o pull request da branch atual contra `main` e concluir o merge em `main`.

## Quando usar

- Usuário digita `/fazer-merge`
- Usuário pede explicitamente para criar o PR e mergear em `main`

## Pré-checagens

Antes de qualquer ação:

1. Confirmar o repositório git e a branch atual (`git status`, `git branch --show-current`).
2. **Não** executar se a branch atual for `main` (ou `master`).
3. Garantir working tree limpa: commit de alterações pendentes se o usuário autorizar; caso contrário, abortar e informar.
4. Fazer push da branch: `git push -u origin HEAD`.

## Passo a passo

### 1. Localizar ou criar o PR

```bash
gh pr view --json url,number,state,isDraft,baseRefName,headRefName,title,mergeable
```

- Se já existir PR aberto da branch atual → reutilizar.
- Se a base não for `main` → atualizar a base para `main` antes do merge.
- Se não existir PR:

```bash
gh pr create --base main --head "$(git branch --show-current)" --title "<título curto>" --body "$(cat <<'EOF'
## Summary
- <1–3 bullets do que a branch entrega>

## Test plan
- [ ] Smoke manual / checks relevantes
EOF
)"
```

Título: preferir mensagem do último commit ou resumo objetivo das mudanças (`git log origin/main..HEAD --oneline`).

Em ambientes Cloud Agent, preferir a tool `ManagePullRequest` (`create_pr` / `update_pr`) com `base_branch: main` e **`draft: false`** (PR já pronta para review/merge, nunca draft).

### 2. Garantir que o PR está pronto (não draft)

**Sempre** antes de tentar o merge — inclusive se o PR foi reutilizado ou criado por outro agente em draft:

```bash
gh pr ready
```

- Se o PR já estiver ready, o comando é idempotente / seguro; seguir em frente.
- Se `gh pr ready` falhar, reportar e parar (draft bloqueia merge no GitHub).
- Em Cloud Agent com `ManagePullRequest`: ao criar/atualizar, usar sempre `draft: false`.

### 3. Aguardar mergeabilidade

```bash
gh pr view --json mergeable,mergeStateStatus,statusCheckRollup,isDraft,url,number
```

- Se `isDraft` for `true` → repetir o passo 2; **não** chamar merge em draft.
- Se `mergeable` for `CONFLICTING` → **não** mergear; reportar conflitos e parar.
- Se checks obrigatórios estiverem falhando → reportar e parar (a menos que o usuário peça merge forçado explicitamente).
- Se ainda estiver calculando (`UNKNOWN` / checks pendentes) → aguardar e reconsultar.

### 4. Merge em `main`

Preferência: **squash** (histórico limpo no FinanceFlow).

```bash
gh pr merge --squash --delete-branch
```

Alternativas só se o usuário pedir:

- `--merge` (merge commit)
- `--rebase`

Se `gh pr merge` não estiver disponível ou falhar por permissão, usar fluxo local:

```bash
git fetch origin main
git checkout main
git pull origin main
git merge --squash "<branch>"
git commit -m "<mensagem do squash>"
git push origin main
git push origin --delete "<branch>"
```

### 5. Confirmação final

1. Confirmar que o PR ficou `MERGED`.
2. Confirmar que `origin/main` inclui o merge (`git fetch origin main && git log origin/main -1 --oneline`).
3. Responder ao usuário com: URL do PR, método de merge e SHA/commit resultante em `main`.

## Regras

- Destino sempre `main`, salvo pedido explícito contrário.
- **Sempre** marcar o PR como pronto (`gh pr ready` / `draft: false`) antes do merge; nunca deixar em draft.
- Nunca mergear com conflitos não resolvidos.
- Nunca usar `--admin` / bypass de proteção sem pedido explícito do usuário.
- Não forçar push em `main` (`--force`).
- Mensagens e resumo ao usuário em **português (pt-BR)**.
- Escopo mínimo: esta skill só cria PR + merge; não refatora código não relacionado.

## Checklist

- [ ] Branch ≠ `main` e está pushed
- [ ] PR aberto (ou reutilizado) com base `main`
- [ ] PR marcado como pronto (não draft) via `gh pr ready` / `draft: false`
- [ ] Sem conflitos / checks críticos OK
- [ ] Merge concluído (preferencialmente squash)
- [ ] Branch remota removida quando aplicável
- [ ] Usuário recebeu URL do PR + confirmação do merge

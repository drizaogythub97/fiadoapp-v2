# 03 — Plano de Migração de Dados (F3 + cutover na F5)

**Requisito absoluto: zero perda.** O dono usa o FiadoApp diariamente no
comércio dele. O MySQL da Hostinger permanece intacto como rollback até o fim.

## Acesso ao MySQL (passo do dono, guiado na hora)

Preferência 1 — **Remote MySQL**: hPanel → Bancos de Dados → MySQL Remoto →
adicionar o IP atual da máquina (ou `%` temporariamente). Anotar o host exibido
(ex.: `srvXXX.hstgr.io`), nome do banco, usuário e senha (os mesmos do
`config/conexao.php` do servidor). As credenciais vão APENAS no `.env.local`
(`FIADO_MYSQL_URL` ou vars soltas) — nunca no repo.

Fallback — export manual: phpMyAdmin → Exportar → SQL (estrutura + dados) e
entregar o arquivo.

## Ferramentas

Sem psql/docker na máquina. Script Node dentro do projeto:
`npm i mysql2 pg --no-save` + script `.mjs` temporário (apagar depois;
conferir que package.json/lock não mudaram).

## Etapas

1. **Snapshot**: dump completo do MySQL guardado localmente (fora do repo)
   antes de qualquer coisa.
2. **Dry-run**: rodar a migração completa para as tabelas `fiado_*` com um
   marcador de lote (`migration_batch`), SEM cutover. Gerar **relatório de
   validação**:
   - contagem por tabela (origem × destino);
   - `SUM(valor_total)` das vendas por status;
   - **"Total a receber" idêntico ao dashboard do app antigo** (critério nº 1);
   - saldo devedor por cliente (top 20) lado a lado;
   - inadimplentes: mesma lista/dias de atraso;
   - amostras aleatórias de vendas com itens comparadas campo a campo.
3. **Revisão do dono** sobre o relatório.
4. As features da F4 são desenvolvidas/validadas com esses dados reais migrados
   (mesmo usuário dono; Previews protegidos por login — RLS isola).
5. **Migração final (janela de congelamento, na F5)**: dono para de usar o app
   antigo (~1h) → wipe do lote anterior → re-migração completa → validação
   automática de novo → DNS cutover → dono passa a usar o v2.
6. **Rollback**: se algo der errado, DNS volta para a Hostinger — o app PHP e o
   MySQL nunca foram tocados.

## Mapeamento de identidade

- Confirmar o e-mail do `usuarios` do FiadoApp. Se for o mesmo da conta Gaveta
  do dono → dados apontam para o `auth.users.id` existente (SSO imediato, sem
  senha nova).
- Se houver outros usuários reais no MySQL (verificar!): importar via Admin API
  do Supabase (`createUser` com `password_hash` bcrypt — validar suporte na
  versão atual) ou convite de redefinição de senha.

## Pós-cutover

- App PHP fica no ar como fallback (sem link) até confiança total.
- Guardar o dump final do MySQL (backup frio) antes de deixar o plano
  Hostinger expirar. **Nunca deixar o REGISTRO do domínio vencer.**
- O workflow de backup automático do banco (padrão Gaveta, `backup-db.yml`)
  já cobre as tabelas `fiado_*` por ser o mesmo Postgres.

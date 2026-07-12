"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ErrorAlert, SuccessAlert } from "@/components/auth/form-feedback";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_HINT, PASSWORD_MIN } from "@/lib/validations/password";

import {
  atualizarNome,
  excluirConta,
  trocarEmail,
  trocarSenha,
} from "./actions";

type Props = {
  nomeInicial: string;
  email: string;
  criadaEm: string | null;
};

const DATA_FMT = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Aviso = { kind: "success" | "error"; message: string } | null;

export function ContaClient({ nomeInicial, email, criadaEm }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [aviso, setAviso] = useState<Aviso>(null);

  // ===== Edição inline do nome =====
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeRascunho, setNomeRascunho] = useState(nomeInicial);
  const [nomeErro, setNomeErro] = useState<string | null>(null);
  const [salvandoNome, startNome] = useTransition();

  function salvarNome() {
    setNomeErro(null);
    startNome(async () => {
      const result = await atualizarNome(nomeRascunho);
      if (result.ok) {
        setNome(nomeRascunho.trim());
        setEditandoNome(false);
        setAviso({ kind: "success", message: "Nome atualizado." });
      } else {
        setNomeErro(result.error ?? "Não foi possível salvar.");
      }
    });
  }

  // ===== Diálogo de troca de e-mail =====
  const [emailAberto, setEmailAberto] = useState(false);
  const [emailSenhaAtual, setEmailSenhaAtual] = useState("");
  const [emailNovo, setEmailNovo] = useState("");
  const [emailErro, setEmailErro] = useState<string | null>(null);
  const [salvandoEmail, startEmail] = useTransition();

  function fecharEmail() {
    if (salvandoEmail) return;
    setEmailAberto(false);
    setEmailSenhaAtual("");
    setEmailNovo("");
    setEmailErro(null);
  }
  function submeterEmail() {
    setEmailErro(null);
    startEmail(async () => {
      const result = await trocarEmail(emailSenhaAtual, emailNovo);
      if (result.ok) {
        fecharEmail();
        setAviso({
          kind: "success",
          message:
            "Enviamos um link para o novo e-mail. Confirme por lá para finalizar a troca.",
        });
      } else {
        setEmailErro(result.error ?? "Não foi possível salvar.");
      }
    });
  }

  // ===== Diálogo de troca de senha =====
  const [senhaAberta, setSenhaAberta] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [salvandoSenha, startSenha] = useTransition();

  function fecharSenha() {
    if (salvandoSenha) return;
    setSenhaAberta(false);
    setSenhaAtual("");
    setSenhaNova("");
    setSenhaConfirma("");
    setSenhaErro(null);
  }
  function submeterSenha() {
    setSenhaErro(null);
    if (senhaNova !== senhaConfirma) {
      setSenhaErro("A confirmação não bate com a nova senha.");
      return;
    }
    startSenha(async () => {
      const result = await trocarSenha(senhaAtual, senhaNova);
      if (result.ok) {
        fecharSenha();
        setAviso({ kind: "success", message: "Senha atualizada." });
      } else {
        setSenhaErro(result.error ?? "Não foi possível salvar.");
      }
    });
  }

  // ===== Exclusão =====
  const [excluirAberto, setExcluirAberto] = useState(false);
  const [excluirSenha, setExcluirSenha] = useState("");
  const [excluirErro, setExcluirErro] = useState<string | null>(null);
  const [excluindo, startExcluir] = useTransition();

  function fecharExcluir() {
    if (excluindo) return;
    setExcluirAberto(false);
    setExcluirSenha("");
    setExcluirErro(null);
  }
  function submeterExcluir() {
    setExcluirErro(null);
    startExcluir(async () => {
      const result = await excluirConta(excluirSenha);
      if (result && result.ok === false) {
        setExcluirErro(result.error);
      }
      // Em caso de sucesso o servidor redireciona para /login.
    });
  }

  return (
    <div className="minimal:max-sm:gap-4 flex flex-col gap-6">
      {aviso?.kind === "success" ? (
        <SuccessAlert message={aviso.message} />
      ) : null}
      {aviso?.kind === "error" ? <ErrorAlert message={aviso.message} /> : null}

      <section
        aria-labelledby="dados-heading"
        className="ring-foreground/10 bg-card flex flex-col gap-1 rounded-xl p-5 ring-1"
      >
        <header className="mb-2">
          <h2 id="dados-heading" className="text-xl font-semibold">
            Dados pessoais
          </h2>
          <p className="minimal:max-sm:text-sm text-muted-foreground text-base">
            Para alterar o e-mail ou a senha pedimos a sua senha atual.
          </p>
        </header>

        {/* E-mail */}
        <Linha
          rotulo="E-mail"
          valor={email}
          onAlterar={() => {
            setEmailSenhaAtual("");
            setEmailNovo("");
            setEmailErro(null);
            setEmailAberto(true);
          }}
        />

        {/* Nome */}
        <div className="border-border border-t py-4">
          <p className="text-muted-foreground text-sm">Nome</p>
          {editandoNome ? (
            <div className="mt-2 flex flex-col gap-2">
              <Label htmlFor="nome-rascunho" className="sr-only">
                Novo nome
              </Label>
              <Input
                id="nome-rascunho"
                type="text"
                value={nomeRascunho}
                onChange={(e) => setNomeRascunho(e.target.value)}
                autoFocus
                disabled={salvandoNome}
                className="h-14 text-lg"
                minLength={2}
                maxLength={120}
              />
              {nomeErro ? (
                <p className="text-destructive text-sm" role="alert">
                  {nomeErro}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditandoNome(false);
                    setNomeRascunho(nome);
                    setNomeErro(null);
                  }}
                  disabled={salvandoNome}
                  className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={salvarNome}
                  disabled={salvandoNome}
                  aria-busy={salvandoNome}
                  className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
                >
                  {salvandoNome ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="text-foreground text-lg">
                {nome || (
                  <span className="text-muted-foreground italic">
                    (sem nome cadastrado)
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNomeRascunho(nome);
                  setNomeErro(null);
                  setEditandoNome(true);
                }}
                className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
              >
                <Pencil aria-hidden="true" className="size-4" />
                Alterar
              </Button>
            </div>
          )}
        </div>

        {/* Senha */}
        <Linha
          rotulo="Senha"
          valor="••••••••"
          onAlterar={() => {
            setSenhaAtual("");
            setSenhaNova("");
            setSenhaConfirma("");
            setSenhaErro(null);
            setSenhaAberta(true);
          }}
        />

        {criadaEm ? (
          <div className="text-muted-foreground border-border border-t pt-4 text-sm">
            <p>
              Conta criada em{" "}
              <strong className="text-foreground font-medium">
                {DATA_FMT.format(new Date(criadaEm))}
              </strong>
              .
            </p>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="excluir-heading"
        className="ring-destructive/30 bg-destructive/5 flex flex-col gap-4 rounded-xl p-5 ring-1"
      >
        <header>
          <h2
            id="excluir-heading"
            className="text-destructive text-xl font-semibold"
          >
            Excluir conta
          </h2>
          <p className="text-foreground/80 text-base">
            Esta ação <strong>não pode ser desfeita</strong>. Todos os seus
            clientes, vendas, pagamentos e dados pessoais serão apagados
            imediatamente. A conta é a mesma do ecossistema: se você também
            usa o <strong>Gaveta</strong>, os dados de lá serão apagados
            junto.
          </p>
        </header>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            setExcluirSenha("");
            setExcluirErro(null);
            setExcluirAberto(true);
          }}
          className="h-12 px-5 text-base sm:self-start"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Excluir minha conta
        </Button>
      </section>

      {/* ===== Diálogos ===== */}

      <ConfirmDialog
        open={emailAberto}
        onClose={fecharEmail}
        title="Alterar e-mail"
        description="Confirme sua senha atual e digite o novo e-mail. Enviaremos um link de confirmação para o novo endereço."
        confirmLabel="Salvar"
        onConfirm={submeterEmail}
        pending={salvandoEmail}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-senha-atual" className="text-base">
              Senha atual
            </Label>
            <PasswordField
              id="email-senha-atual"
              name="currentPassword"
              autoComplete="current-password"
              value={emailSenhaAtual}
              onChange={(e) => setEmailSenhaAtual(e.target.value)}
              disabled={salvandoEmail}
              className="h-14 text-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-novo" className="text-base">
              Novo e-mail
            </Label>
            <Input
              id="email-novo"
              type="email"
              autoComplete="off"
              value={emailNovo}
              onChange={(e) => setEmailNovo(e.target.value)}
              disabled={salvandoEmail}
              className="h-14 text-lg"
              required
            />
          </div>
          {emailErro ? (
            <p className="text-destructive text-sm" role="alert">
              {emailErro}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={senhaAberta}
        onClose={fecharSenha}
        title="Alterar senha"
        description={PASSWORD_HINT}
        confirmLabel="Salvar"
        onConfirm={submeterSenha}
        pending={salvandoSenha}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha-atual" className="text-base">
              Senha atual
            </Label>
            <PasswordField
              id="senha-atual"
              name="currentPassword"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              disabled={salvandoSenha}
              className="h-14 text-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha-nova" className="text-base">
              Nova senha
            </Label>
            <PasswordField
              id="senha-nova"
              name="newPassword"
              autoComplete="new-password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              minLength={PASSWORD_MIN}
              disabled={salvandoSenha}
              className="h-14 text-lg"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha-confirma" className="text-base">
              Confirme a nova senha
            </Label>
            <PasswordField
              id="senha-confirma"
              name="confirmPassword"
              autoComplete="new-password"
              value={senhaConfirma}
              onChange={(e) => setSenhaConfirma(e.target.value)}
              minLength={PASSWORD_MIN}
              disabled={salvandoSenha}
              className="h-14 text-lg"
            />
          </div>
          {senhaErro ? (
            <p className="text-destructive text-sm" role="alert">
              {senhaErro}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={excluirAberto}
        onClose={fecharExcluir}
        title="Excluir conta definitivamente?"
        description={
          <span>
            Confirme sua senha para apagar todos os seus dados — do FiadoApp
            e do Gaveta, se você usar os dois. Essa ação{" "}
            <strong className="text-foreground">não pode ser desfeita</strong>
            .
          </span>
        }
        confirmLabel="Excluir conta"
        confirmVariant="destructive"
        onConfirm={submeterExcluir}
        pending={excluindo}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="excluir-senha" className="text-base">
            Sua senha
          </Label>
          <PasswordField
            id="excluir-senha"
            name="password"
            autoComplete="current-password"
            value={excluirSenha}
            onChange={(e) => setExcluirSenha(e.target.value)}
            disabled={excluindo}
            className="h-14 text-lg"
          />
          {excluirErro ? (
            <p className="text-destructive text-sm" role="alert">
              {excluirErro}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  onAlterar,
}: {
  rotulo: string;
  valor: string;
  onAlterar: () => void;
}) {
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t py-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground text-sm">{rotulo}</p>
        <p className="text-foreground text-lg break-all">{valor}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onAlterar}
        className="minimal:max-sm:h-10 minimal:max-sm:px-3 minimal:max-sm:text-sm h-12 px-5 text-base"
      >
        <Pencil aria-hidden="true" className="size-4" />
        Alterar
      </Button>
    </div>
  );
}

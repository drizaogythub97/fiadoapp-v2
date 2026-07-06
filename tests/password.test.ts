import { describe, expect, it } from "vitest";

import { loginSchema } from "@/lib/validations/auth";
import { checkPasswordStrength } from "@/lib/validations/password";

describe("checkPasswordStrength", () => {
  it("rejeita senhas muito comuns", () => {
    expect(checkPasswordStrength("12345678")).not.toBeNull();
    expect(checkPasswordStrength("senha123")).not.toBeNull();
    expect(checkPasswordStrength("PASSWORD")).not.toBeNull();
    expect(checkPasswordStrength("fiado123")).not.toBeNull();
  });

  it("rejeita sequências óbvias", () => {
    expect(checkPasswordStrength("abcdefgh")).not.toBeNull();
    expect(checkPasswordStrength("87654321")).not.toBeNull();
  });

  it("rejeita baixa variedade de caracteres", () => {
    expect(checkPasswordStrength("aaaaaaaa")).not.toBeNull();
    expect(checkPasswordStrength("abab:abab")).not.toBeNull();
  });

  it("rejeita senha que contém o e-mail ou o nome", () => {
    expect(
      checkPasswordStrength("maria-cardoso7", { email: "maria@x.com" }),
    ).not.toBeNull();
    expect(
      checkPasswordStrength("joaosilva-2030", { name: "João Silva" }),
    ).not.toBeNull();
  });

  it("aceita senha razoável", () => {
    expect(checkPasswordStrength("Cafe-Quente-2030")).toBeNull();
    expect(checkPasswordStrength("girassol roxo 9")).toBeNull();
  });
});

describe("loginSchema", () => {
  it("rejeita e-mail inválido e senha vazia", () => {
    const r = loginSchema.safeParse({ email: "nao-e-email", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("email");
      expect(paths).toContain("password");
    }
  });

  it("aceita credenciais bem-formadas", () => {
    const r = loginSchema.safeParse({
      email: "dono@fiadoapp.net",
      password: "qualquer-senha",
    });
    expect(r.success).toBe(true);
  });
});

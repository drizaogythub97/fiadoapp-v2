import { expect, test } from "@playwright/test";

// Sem sessão, tudo que não é público redireciona para /login.
test("home redireciona visitante para /login", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL("**/login");
  // CardTitle do design system é um <div>, não um heading — asserta o botão.
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("rota protegida redireciona para /login com next=", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login?next=%2Fdashboard");
  await expect(page.getByLabel("E-mail")).toBeVisible();
});

test("login exibe erro de validação sem enviar ao servidor de auth", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Digite um e-mail válido.")).toBeVisible();
});

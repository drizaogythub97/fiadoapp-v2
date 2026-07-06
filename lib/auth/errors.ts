const MAP: Array<{ match: RegExp; pt: string }> = [
  { match: /invalid login credentials/i, pt: "E-mail ou senha incorretos." },
  {
    match: /email not confirmed/i,
    pt: "Confirme seu e-mail antes de entrar.",
  },
  {
    match: /user already registered/i,
    pt: "Este e-mail já está cadastrado.",
  },
  {
    match: /password should be at least/i,
    pt: "A senha deve ter ao menos 8 caracteres.",
  },
  {
    match: /rate limit|too many requests/i,
    pt: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  },
  {
    match: /invalid email/i,
    pt: "Digite um e-mail válido.",
  },
  {
    match: /token has expired|invalid token|otp expired/i,
    pt: "O link expirou. Solicite um novo.",
  },
  {
    match: /signup.*disabled/i,
    pt: "O cadastro está temporariamente indisponível.",
  },
];

export function toPortugueseAuthError(message: string | undefined): string {
  if (!message) return "Ocorreu um erro. Tente novamente.";
  for (const { match, pt } of MAP) {
    if (match.test(message)) return pt;
  }
  return "Ocorreu um erro. Tente novamente.";
}

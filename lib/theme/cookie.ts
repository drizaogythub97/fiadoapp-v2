import { cookies } from "next/headers";

export const THEME_COOKIE = "fiado_theme";
export type Theme = "light" | "dark";

// O FiadoApp é escuro por padrão (identidade herdada do v1); o cookie permite
// trocar para o claro nas Preferências (fase futura).
export async function getThemeFromCookie(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "light" ? "light" : "dark";
}

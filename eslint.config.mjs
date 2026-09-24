import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Formatador de data mora em UM lugar só: `lib/format.ts`.
 *
 * O servidor da Vercel roda em UTC e a máquina de quem desenvolve, em
 * Brasília. Um `Intl.DateTimeFormat` solto, sem `timeZone`, funciona na
 * máquina de quem escreveu e mostra o dia errado em produção — foi assim
 * que a data de criação da conta saiu trocada. Esta regra fecha a porta:
 * quem precisa formatar data importa de `lib/format.ts`, onde o fuso da
 * loja já está fixo.
 *
 * Só data e hora: `toLocaleString` de número e moeda continua liberado.
 */
const semFormatadorDeDataSolto = {
  files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
  ignores: ["lib/format.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "NewExpression[callee.object.name='Intl'][callee.property.name='DateTimeFormat']",
        message:
          "Formatador de data só em lib/format.ts (o fuso da loja é fixo lá). Importe formatDataHoraBR/formatInstanteBR.",
      },
      {
        selector:
          "CallExpression[callee.property.name=/^toLocale(Date|Time)String$/]",
        message:
          "toLocaleDateString/toLocaleTimeString só em lib/format.ts (o fuso da loja é fixo lá). Importe formatDataHoraBR/formatInstanteBR.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  semFormatadorDeDataSolto,
]);

export default eslintConfig;

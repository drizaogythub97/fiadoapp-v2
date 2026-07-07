export { default } from "../loading";

// O App Router usa a Suspense boundary MAIS PRÓXIMA do segmento que muda —
// a loading.tsx do (app) não cobre navegações dentro de /clientes
// (lista ↔ novo ↔ [id]). Este re-export garante o loader de marca nelas.

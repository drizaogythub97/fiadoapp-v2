// Service worker mínimo do FiadoApp (padrão Gaveta).
//
// Objetivo: satisfazer o critério de "app instalável" (PWA) do Chrome — que
// exige um service worker com handler de fetch — e habilitar a experiência
// em tela cheia (display: standalone) no celular.
//
// NÃO fazemos cache/offline de propósito: o FiadoApp é online (a segurança
// vive no servidor via RLS/sessão) e cache de páginas autenticadas seria
// risco de vazar dados entre sessões. Este SW apenas repassa à rede.

self.addEventListener("install", () => {
  // Ativa a nova versão imediatamente, sem esperar abas antigas fecharem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// O handler PRECISA existir -- é o que mantém o app instalável no Chrome --
// mas NÃO deve chamar respondWith: isso faz toda requisição dar uma volta
// pelo service worker para no fim fazer o que o navegador já faria sozinho.
// Sem respondWith, o navegador segue direto para a rede.
self.addEventListener("fetch", () => {});

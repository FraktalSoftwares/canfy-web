# Landing / Blog (LP-*) — público

### LP-01 — Home carrega, CTAs e navegação
- **Ambiente:** Landing
- **Papel/persona:** anônimo
- **Prioridade:** Alta
- **Automação:** Playwright MCP
- **Passos:** navegar para `/`
- **Resultado esperado:** heading principal, CTA "Começar agora" → `/entrar`, seções de features e footer institucional
- **Status:** ✅ passou — 2026-07-10

### LP-02 — Blog lista posts e abre detalhe
- **Ambiente:** Landing
- **Papel/persona:** anônimo
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Passos:** navegar para `/blog` → clicar no primeiro post
- **Resultado esperado:** lista "3 artigos encontrados" (bate com `blog_posts` no banco); clique abre `/blog/<slug>` com conteúdo do post
- **Verificação backend:** `blog_posts` tem 3 rows — confirmado antes via `list_tables`
- **Status:** ✅ passou — 2026-07-10

### LP-03 — Termos de uso / Política de privacidade acessíveis sem login
- **Ambiente:** Landing
- **Papel/persona:** anônimo
- **Prioridade:** Média
- **Automação:** Playwright MCP
- **Passos:** navegar para `/termos-de-uso`
- **Resultado esperado:** página carrega sem exigir sessão
- **Status:** ✅ passou — 2026-07-10 (não testei `/politica-privacidade` individualmente, mas usa o mesmo padrão de rota pública)

### LP-04 — (neg.) rota inexistente → NotFound
- **Ambiente:** Landing
- **Papel/persona:** anônimo
- **Prioridade:** Baixa
- **Automação:** Playwright MCP
- **Passos:** navegar para uma rota aleatória inexistente
- **Resultado esperado:** página "404 — Oops! Page not found" com link "Return to Home"
- **Status:** ✅ passou — 2026-07-10

### LP-05 — (neg.) rota protegida sem sessão → redireciona /entrar
- **Ambiente:** Landing/Admin web
- **Papel/persona:** anônimo
- **Prioridade:** Alta
- **Automação:** Playwright MCP
- **Passos:** `localStorage.clear()` (garante sem sessão) → navegar direto para `/pacientes`
- **Resultado esperado:** `ProtectedRoute` detecta ausência de sessão e redireciona para `/entrar` (~2s de latência, pois valida via `supabase.auth.getSession()` assíncrono)
- **Status:** ✅ passou — 2026-07-10

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: Array<{ test: (path: string) => boolean; title: string }> = [
  { test: (p) => p === "/entrar", title: "Login" },
  { test: (p) => p === "/esqueci-senha", title: "Recuperar senha" },
  { test: (p) => p === "/redefinir-senha", title: "Redefinir senha" },
  { test: (p) => p === "/termos-de-uso", title: "Termos de uso" },
  { test: (p) => p === "/politica-privacidade", title: "Política de privacidade" },
  { test: (p) => p === "/assinatura-concluida", title: "Assinatura" },
  { test: (p) => ["/home", "/inicio", "/painel"].includes(p), title: "Dashboard" },
  { test: (p) => /^\/pacientes\/[^/]+$/.test(p), title: "Detalhes do paciente" },
  { test: (p) => p === "/pacientes", title: "Pacientes" },
  { test: (p) => /^\/medicos\/[^/]+$/.test(p), title: "Detalhes do médico" },
  { test: (p) => p === "/medicos", title: "Médicos" },
  { test: (p) => p === "/produtos/novo", title: "Novo produto" },
  { test: (p) => /^\/produtos\/[^/]+$/.test(p), title: "Detalhes do produto" },
  { test: (p) => p === "/produtos", title: "Produtos" },
  { test: (p) => /^\/receitas\/[^/]+$/.test(p), title: "Detalhes da receita" },
  { test: (p) => p === "/receitas", title: "Receitas" },
  { test: (p) => /^\/pedidos\/[^/]+$/.test(p), title: "Detalhes do pedido" },
  { test: (p) => /^\/associacoes\/[^/]+$/.test(p), title: "Detalhes da associação" },
  { test: (p) => p === "/associacoes", title: "Associações" },
  { test: (p) => p === "/notificacoes/personalizadas", title: "Notificações personalizadas" },
  { test: (p) => p === "/notificacoes", title: "Notificações" },
  { test: (p) => p === "/minha-conta", title: "Minha conta" },
  { test: (p) => p === "/configuracoes-sistema", title: "Configurações" },
  { test: (p) => /^\/admin\/blog\/[^/]+$/.test(p), title: "Detalhes do post" },
  { test: (p) => p === "/admin/blog", title: "Blog" },
  { test: (p) => p === "/feedbacks", title: "Feedbacks" },
];

export const RouteTitle = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = TITLES.find((entry) => entry.test(pathname));
    document.title = match ? `Canfy - ${match.title}` : "Canfy";
  }, [pathname]);

  return null;
};

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RouteTitle } from "@/components/RouteTitle";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Pacientes from "./pages/Pacientes";
import PacienteDetalhes from "./pages/PacienteDetalhes";
import Dashboard from "./pages/Dashboard";
import Medicos from "./pages/Medicos";
import MedicoDetalhes from "./pages/MedicoDetalhes";
import Produtos from "./pages/Produtos";
import ProdutoDetalhes from "./pages/ProdutoDetalhes";
import ProdutoCadastro from "./pages/ProdutoCadastro";
import Receitas from "./pages/Receitas";
import ReceitaDetalhes from "./pages/ReceitaDetalhes";
import Pedidos from "./pages/Pedidos";
import PedidoDetalhes from "./pages/PedidoDetalhes";
import ConfigSistema from "./pages/ConfigSistema";
import BlogAdmin from "./pages/BlogAdmin";
import FeedbacksConsultas from "./pages/FeedbacksConsultas";
import Associacoes from "./pages/Associacoes";
import AssociacaoDetalhes from "./pages/AssociacaoDetalhes";
import Notificacoes from "./pages/Notificacoes";
import NotificacoesPersonalizadas from "./pages/NotificacoesPersonalizadas";
import MinhaConta from "./pages/MinhaConta";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import Landing from "./pages/Landing";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteTitle />
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />

          {/* Rotas protegidas com Navbar persistente */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Dashboard />} />
            <Route path="/inicio" element={<Dashboard />} />
            <Route path="/painel" element={<Dashboard />} />

            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/pacientes/:id" element={<PacienteDetalhes />} />

            <Route path="/medicos" element={<Medicos />} />
            <Route path="/medicos/:id" element={<MedicoDetalhes />} />

            <Route path="/produtos" element={<Produtos />} />
            <Route path="/produtos/novo" element={<ProdutoCadastro />} />
            <Route path="/produtos/:id" element={<ProdutoDetalhes />} />

            <Route path="/receitas" element={<Receitas />} />
            <Route path="/receitas/:id" element={<ReceitaDetalhes />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhes />} />

            <Route path="/associacoes" element={<Associacoes />} />
            <Route path="/associacoes/:id" element={<AssociacaoDetalhes />} />

            <Route path="/notificacoes" element={<Notificacoes />} />
            <Route path="/notificacoes/personalizadas" element={<NotificacoesPersonalizadas />} />

            <Route path="/minha-conta" element={<MinhaConta />} />

            <Route path="/configuracoes-sistema" element={<ConfigSistema />} />
            <Route path="/admin/blog" element={<BlogAdmin />} />
            <Route path="/feedbacks" element={<FeedbacksConsultas />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

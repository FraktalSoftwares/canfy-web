import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import Associacoes from "./pages/Associacoes";
import AssociacaoDetalhes from "./pages/AssociacaoDetalhes";
import Notificacoes from "./pages/Notificacoes";
import NotificacoesPersonalizadas from "./pages/NotificacoesPersonalizadas";
import MinhaConta from "./pages/MinhaConta";
import TermosDeUso from "./pages/TermosDeUso";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/entrar" element={<Login />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
          
          {/* Rotas protegidas */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inicio" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/painel" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
          <Route path="/pacientes/:id" element={<ProtectedRoute><PacienteDetalhes /></ProtectedRoute>} />
          
          <Route path="/medicos" element={<ProtectedRoute><Medicos /></ProtectedRoute>} />
          <Route path="/medicos/:id" element={<ProtectedRoute><MedicoDetalhes /></ProtectedRoute>} />
          
          <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
          <Route path="/produtos/novo" element={<ProtectedRoute><ProdutoCadastro /></ProtectedRoute>} />
          <Route path="/produtos/:id" element={<ProtectedRoute><ProdutoDetalhes /></ProtectedRoute>} />
          
          <Route path="/receitas" element={<ProtectedRoute><Receitas /></ProtectedRoute>} />
          <Route path="/receitas/:id" element={<ProtectedRoute><ReceitaDetalhes /></ProtectedRoute>} />
          
          <Route path="/associacoes" element={<ProtectedRoute><Associacoes /></ProtectedRoute>} />
          <Route path="/associacoes/:id" element={<ProtectedRoute><AssociacaoDetalhes /></ProtectedRoute>} />
          
          <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
          <Route path="/notificacoes/personalizadas" element={<ProtectedRoute><NotificacoesPersonalizadas /></ProtectedRoute>} />
          
          <Route path="/minha-conta" element={<ProtectedRoute><MinhaConta /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

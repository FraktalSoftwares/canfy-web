# Canfy - Sistema de Gestão Médica

Sistema completo de gestão médica para prescrição e acompanhamento de produtos à base de cannabis medicinal.

## 📋 Sobre o Projeto

O **Canfy** é uma plataforma web desenvolvida para gerenciar todo o ciclo de vida de prescrições médicas de produtos à base de cannabis, desde o cadastro de pacientes e médicos até o acompanhamento de pedidos e receitas.

### Principais Funcionalidades

- 👥 **Gestão de Pacientes**: Cadastro, consulta e acompanhamento de pacientes
- 👨‍⚕️ **Gestão de Médicos**: Aprovação, cadastro e gerenciamento de médicos prescritores
- 📋 **Receitas Médicas**: Emissão, validação e acompanhamento de receitas
- 🛒 **Pedidos**: Criação e rastreamento de pedidos de produtos
- 📦 **Catálogo de Produtos**: Gerenciamento completo de produtos disponíveis
- 🏢 **Associações e Marcas**: Cadastro de fornecedores
- 📊 **Dashboard**: Visão geral com métricas e estatísticas
- 🔔 **Notificações**: Sistema completo de notificações em tempo real
- 📄 **Documentos**: Upload e gerenciamento de documentos

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Estado**: TanStack Query (React Query)
- **Roteamento**: React Router DOM
- **Validação**: Zod + React Hook Form
- **Gráficos**: Recharts
- **Ícones**: Lucide React

## 📦 Pré-requisitos

- Node.js 18+ (recomendado usar [nvm](https://github.com/nvm-sh/nvm))
- npm ou yarn
- Conta no Supabase (para configuração do backend)

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/FraktalSoftwares/canfy-web.git
cd canfy-web
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:8080`

## 📁 Estrutura do Projeto

```
canfy-web/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   │   ├── ui/          # Componentes UI (shadcn/ui)
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/           # Páginas da aplicação
│   ├── hooks/           # Custom hooks
│   ├── integrations/    # Integrações (Supabase)
│   ├── lib/             # Utilitários e validações
│   └── assets/          # Recursos estáticos
├── supabase/
│   ├── migrations/      # Migrations do banco de dados
│   └── functions/       # Edge Functions
├── public/              # Arquivos públicos
└── docs/                # Documentação
```

## 🗄️ Banco de Dados

O projeto utiliza **Supabase** como backend, que fornece:

- **PostgreSQL**: Banco de dados relacional
- **Auth**: Autenticação de usuários
- **Storage**: Armazenamento de arquivos
- **Realtime**: Atualizações em tempo real

### Migrations

Todas as migrations estão localizadas em `supabase/migrations/`. Para aplicar as migrations:

```bash
# Usando Supabase CLI
supabase db push
```

## 🔐 Autenticação

O sistema utiliza autenticação via Supabase Auth com os seguintes tipos de usuários:

- **Admin**: Acesso completo ao sistema
- **Médico**: Pode emitir receitas e gerenciar pacientes
- **Paciente**: Acesso limitado aos próprios dados

## 📚 Documentação

- **[Documentação Completa do Projeto](./DOCUMENTACAO_PROJETO.md)**: Informações detalhadas sobre design system, banco de dados, APIs e regras de negócio
- **[Guia Flutter](./GUIA_FLUTTER.md)**: Guia completo para desenvolvimento do módulo mobile em Flutter

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento

# Build
npm run build            # Build para produção
npm run build:dev        # Build em modo desenvolvimento

# Qualidade de Código
npm run lint             # Executa o linter

# Preview
npm run preview          # Preview do build de produção
```

## 🏗️ Build para Produção

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`, prontos para deploy.

## 🚢 Deploy

O projeto pode ser deployado em qualquer plataforma que suporte aplicações React/Vite:

- **Vercel**: Deploy automático via Git
- **Netlify**: Deploy automático via Git
- **AWS Amplify**: Deploy automático via Git
- **Cloudflare Pages**: Deploy automático via Git

### Variáveis de Ambiente no Deploy

Certifique-se de configurar as seguintes variáveis de ambiente na plataforma de deploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado e de propriedade da Fraktal Softwares.

## 👥 Equipe

Desenvolvido por **Fraktal Softwares**

## 📞 Suporte

Para suporte, entre em contato através do repositório ou email da empresa.

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2024

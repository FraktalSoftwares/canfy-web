# Documentação do Projeto Canfy

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Design System](#design-system)
3. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
4. [Regras de Negócio](#regras-de-negócio)
5. [APIs e Endpoints](#apis-e-endpoints)
6. [Autenticação](#autenticação)
7. [Estrutura de Dados](#estrutura-de-dados)
8. [Validações](#validações)
9. [Funcionalidades do Módulo Paciente](#funcionalidades-do-módulo-paciente)

---

## 🎯 Visão Geral

**Canfy** é um sistema de gestão médica para prescrição e acompanhamento de produtos à base de cannabis medicinal.

### Stack Tecnológica (Referência Web)
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI**: shadcn/ui + Tailwind CSS
- **Estado**: TanStack Query (React Query)
- **Validação**: Zod + React Hook Form

### URL do Projeto Supabase
- **URL**: `https://agqqxxfrnpuriwrmwdrq.supabase.co`
- **Chave Pública (anon key)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncXF4eGZybnB1cml3cm13ZHJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDAzNjAsImV4cCI6MjA3NjY3NjM2MH0.uox5JvNblqcQlSD6o-Rv4ZWYiVopVbyE-tnHSVjuVw0`

---

## 🎨 Design System

### Fonte Principal
- **Família**: `'Nunito Sans'`
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Pesos disponíveis**: 400, 500, 600, 700

### Cores (HSL)

#### Cores Principais
| Variável | HSL | Hex | Descrição |
|----------|-----|-----|-----------|
| `--background` | `120 11% 98%` | `#F9FAF9` | Cor de fundo principal |
| `--foreground` | `0 0% 20%` | `#333333` | Cor de texto principal |
| `--primary` | `144 57% 43%` | `#2FAE66` | Verde primário |
| `--primary-dark` | `144 61% 31%` | `#1E7E46` | Verde escuro |
| `--primary-hover` | `144 52% 53%` | `#44C97C` | Verde hover |
| `--secondary` | `0 0% 96%` | - | Cor secundária |
| `--muted` | `0 0% 96%` | - | Cor muted |
| `--muted-foreground` | `0 0% 63%` | `#A0A0A0` | Texto muted |
| `--destructive` | `4 90% 58%` | `#F44336` | Vermelho (erros) |
| `--border` | `0 0% 85%` | `#DADADA` | Cor de borda |
| `--input` | `0 0% 85%` | `#DADADA` | Cor de input |

#### Cores de Status
| Variável | HSL | Hex | Descrição |
|----------|-----|-----|-----------|
| `--status-success` | `122 39% 49%` | `#4CAF50` | Sucesso |
| `--status-warning` | `45 100% 51%` | `#FFC107` | Aviso |
| `--status-error` | `4 90% 58%` | `#F44336` | Erro |

#### Cores para Cards
| Variável | HSL | Hex | Descrição |
|----------|-----|-----|-----------|
| `--card-green` | `134 51% 90%` | `#E8F5E9` | Card verde |
| `--card-yellow` | `48 100% 95%` | `#FFF9E6` | Card amarelo |
| `--card-blue` | `207 89% 94%` | `#E3F2FD` | Card azul |
| `--card-pink` | `340 82% 95%` | `#FCE4EC` | Card rosa |
| `--card-orange` | `36 100% 94%` | `#FFF3E0` | Card laranja |
| `--card-purple` | `291 47% 94%` | `#F3E5F5` | Card roxo |
| `--card-teal` | `174 51% 93%` | `#E0F2F1` | Card teal |
| `--card-red` | `14 77% 95%` | `#FBE9E7` | Card vermelho |

### Border Radius
- **Padrão**: `0.625rem` (10px)
- **Médio**: `calc(var(--radius) - 2px)` (8px)
- **Pequeno**: `calc(var(--radius) - 4px)` (6px)
- **Botões arredondados**: `rounded-full` (totalmente arredondado)
- **Cards**: `rounded-[10px]` (10px)

### Espaçamento
- **Padding padrão**: `2rem` (32px)
- **Gap padrão**: `0.5rem` (8px) a `2rem` (32px)

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. `profiles` (Perfis de Usuários)
Estende `auth.users` do Supabase Auth.

| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária (FK para auth.users) | Sim |
| `nome_completo` | TEXT | Nome completo do usuário | Sim |
| `telefone` | TEXT | Telefone do usuário | Não |
| `foto_perfil_url` | TEXT | URL da foto de perfil | Não |
| `tipo_usuario` | ENUM | 'admin', 'medico', 'paciente' | Sim (default: 'paciente') |
| `ativo` | BOOLEAN | Status ativo/inativo | Sim (default: true) |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |
| `updated_at` | TIMESTAMP | Data de atualização | Sim (auto) |

#### 2. `pacientes` (Dados dos Pacientes)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `user_id` | UUID | FK para profiles.id | Sim |
| `cpf` | TEXT | CPF do paciente (único) | Sim |
| `data_nascimento` | DATE | Data de nascimento | Sim |
| `endereco_completo` | TEXT | Endereço completo | Não |
| `total_consultas` | INTEGER | Total de consultas realizadas | Sim (default: 0) |
| `total_pedidos` | INTEGER | Total de pedidos realizados | Sim (default: 0) |
| `ultimo_acesso` | TIMESTAMP | Último acesso ao sistema | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |
| `updated_at` | TIMESTAMP | Data de atualização | Sim (auto) |

#### 3. `receitas` (Receitas Médicas)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `numero_receita` | TEXT | Número único da receita | Sim (único) |
| `medico_id` | UUID | FK para medicos.id | Sim |
| `paciente_id` | UUID | FK para pacientes.id | Sim |
| `data_emissao` | TIMESTAMP | Data de emissão | Sim (default: now()) |
| `validade` | DATE | Data de validade | Sim |
| `observacoes` | TEXT | Observações da receita | Não |
| `status` | ENUM | 'ativa', 'utilizada', 'expirada', 'cancelada' | Sim (default: 'ativa') |
| `documento_url` | TEXT | URL do documento da receita | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |
| `updated_at` | TIMESTAMP | Data de atualização | Sim (auto) |

#### 4. `receita_itens` (Itens da Receita)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `receita_id` | UUID | FK para receitas.id | Sim |
| `produto_id` | UUID | FK para produtos.id | Sim |
| `posologia` | TEXT | Posologia do produto | Sim |
| `quantidade_prescrita` | INTEGER | Quantidade prescrita | Sim |
| `duracao_tratamento` | TEXT | Duração do tratamento | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |

#### 5. `pedidos` (Pedidos de Produtos)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `numero_pedido` | TEXT | Número único do pedido | Sim (único) |
| `receita_id` | UUID | FK para receitas.id | Não |
| `paciente_id` | UUID | FK para pacientes.id | Sim |
| `associacao_marca_id` | UUID | FK para associacoes_marcas.id | Não |
| `data_pedido` | TIMESTAMP | Data do pedido | Sim (default: now()) |
| `valor_total` | DECIMAL(10,2) | Valor total do pedido | Não |
| `forma_pagamento` | TEXT | Forma de pagamento | Não |
| `status` | ENUM | Status do pedido | Sim (default: 'pendente') |
| `canal_aquisicao` | ENUM | 'associacao', 'marca', 'outro' | Sim (default: 'associacao') |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |
| `updated_at` | TIMESTAMP | Data de atualização | Sim (auto) |

#### 6. `pedido_itens` (Itens do Pedido)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `pedido_id` | UUID | FK para pedidos.id | Sim |
| `produto_id` | UUID | FK para produtos.id | Sim |
| `quantidade` | INTEGER | Quantidade do item | Sim |
| `preco_unitario` | DECIMAL(10,2) | Preço unitário | Não |
| `preco_total` | DECIMAL(10,2) | Preço total do item | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |

#### 7. `pedido_historico` (Histórico de Mudanças de Status)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `pedido_id` | UUID | FK para pedidos.id | Sim |
| `status_anterior` | TEXT | Status anterior | Não |
| `status_novo` | TEXT | Novo status | Sim |
| `responsavel_id` | UUID | FK para profiles.id | Não |
| `observacao` | TEXT | Observação da mudança | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |

#### 8. `produtos` (Catálogo de Produtos)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `nome_comercial` | TEXT | Nome comercial | Sim |
| `principio_ativo` | TEXT | Princípio ativo | Sim |
| `concentracao_thc` | TEXT | Concentração de THC | Não |
| `concentracao_cbd` | TEXT | Concentração de CBD | Não |
| `forma_farmaceutica` | ENUM | Forma farmacêutica | Sim |
| `volume_quantidade` | TEXT | Volume/quantidade | Não |
| `fabricante` | TEXT | Fabricante | Não |
| `associacao_marca_id` | UUID | FK para associacoes_marcas.id | Não |
| `imagem_url` | TEXT | URL da imagem | Não |
| `status` | ENUM | 'ativo', 'inativo' | Sim (default: 'ativo') |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |
| `updated_at` | TIMESTAMP | Data de atualização | Sim (auto) |

#### 9. `documentos` (Documentos Anexados)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `paciente_id` | UUID | FK para pacientes.id | Não |
| `medico_id` | UUID | FK para medicos.id | Não |
| `tipo` | ENUM | Tipo do documento | Sim |
| `nome_arquivo` | TEXT | Nome do arquivo | Sim |
| `arquivo_url` | TEXT | URL do arquivo | Sim |
| `tamanho_bytes` | BIGINT | Tamanho em bytes | Não |
| `enviado_por` | UUID | FK para profiles.id | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |

#### 10. `notificacoes` (Sistema de Notificações)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `tipo` | ENUM | 'sistema', 'personalizada' | Sim (default: 'sistema') |
| `categoria` | ENUM | Categoria da notificação | Sim (default: 'geral') |
| `titulo` | TEXT | Título da notificação | Sim |
| `descricao` | TEXT | Descrição da notificação | Sim |
| `destinatario_id` | UUID | FK para profiles.id | Não |
| `destinatario_tipo` | ENUM | Tipo de destinatário | Sim (default: 'especifico') |
| `tipo_envio` | ENUM | 'imediato', 'agendado' | Sim (default: 'imediato') |
| `data_envio` | TIMESTAMP | Data de envio | Sim (default: now()) |
| `lida` | BOOLEAN | Se foi lida | Sim (default: false) |
| `lida_em` | TIMESTAMP | Data de leitura | Não |
| `created_at` | TIMESTAMP | Data de criação | Sim (auto) |

#### 11. `preferencias_notificacoes` (Preferências de Notificação)
| Campo | Tipo | Descrição | Obrigatório |
|-------|------|-----------|-------------|
| `id` | UUID | Chave primária | Sim |
| `user_id` | UUID | FK para profiles.id (único) | Sim |
| `notif_email` | BOOLEAN | Notificações por email | Sim (default: true) |
| `notif_sms` | BOOLEAN | Notificações por SMS | Sim (default: false) |
| `notif_push` | BOOLEAN | Notificações push | Sim (default: true) |
| `tipos_consultas` | BOOLEAN | Notificações de consultas | Sim (default: true) |
| `tipos_entregas` | BOOLEAN | Notificações de entregas | Sim (default: true) |
| `tipos_anvisa` | BOOLEAN | Notificações ANVISA | Sim (default: true) |
| `tipos_novas_receitas` | BOOLEAN | Notificações de novas receitas | Sim (default: true) |
| `updated_at` | TIMESTAMP | Data de atualização | Sim (auto) |

### Enums (Tipos Enumerados)

#### `tipo_usuario`
- `'admin'`
- `'medico'`
- `'paciente'`

#### `app_role` (Roles RBAC)
- `'super_admin'`
- `'admin'`
- `'gestor'`
- `'visualizador'`

#### `status_medico`
- `'ativo'`
- `'inativo'`
- `'pendente_aprovacao'`

#### `status_receita`
- `'ativa'`
- `'utilizada'`
- `'expirada'`
- `'cancelada'`

#### `status_pedido`
- `'pendente'`
- `'aprovado'`
- `'em_analise'`
- `'recusado'`
- `'cancelado'`
- `'em_separacao'`
- `'enviado'`
- `'entregue'`

#### `status_generico`
- `'ativo'`
- `'inativo'`

#### `forma_farmaceutica`
- `'oleo'`
- `'capsula'`
- `'spray'`
- `'gel'`
- `'creme'`
- `'outro'`

#### `tipo_fornecedor`
- `'associacao'`
- `'marca'`

#### `canal_aquisicao`
- `'associacao'`
- `'marca'`
- `'outro'`

#### `tipo_documento`
- `'laudo_medico'`
- `'exame'`
- `'identidade'`
- `'comprovante_residencia'`
- `'autorizacao_anvisa'`
- `'outro'`

#### `tipo_notificacao`
- `'sistema'`
- `'personalizada'`

#### `categoria_notificacao`
- `'financeira'`
- `'gestao_usuarios'`
- `'gestao_pedidos'`
- `'catalogo'`
- `'alertas_tecnicos'`
- `'engajamento'`
- `'riscos'`
- `'geral'`

#### `destinatario_tipo`
- `'todos'`
- `'todos_medicos'`
- `'todos_pacientes'`
- `'especifico'`

#### `tipo_envio`
- `'imediato'`
- `'agendado'`

---

## 📐 Regras de Negócio

### Autenticação e Usuários
1. **Criação de Usuário**: Quando um novo usuário é criado no `auth.users`, um registro correspondente deve ser criado na tabela `profiles` com `tipo_usuario = 'paciente'` por padrão.
2. **Paciente**: Todo paciente deve ter um registro em `profiles` e um registro correspondente em `pacientes` vinculado pelo `user_id`.
3. **Ativação/Inativação**: A inativação de um paciente atualiza o campo `ativo = false` na tabela `profiles`.

### Receitas
1. **Validade**: Receitas têm uma data de validade (`validade`). Receitas expiradas devem ter status `'expirada'`.
2. **Status**: Uma receita pode estar `'ativa'`, `'utilizada'`, `'expirada'` ou `'cancelada'`.
3. **Número Único**: Cada receita possui um `numero_receita` único.
4. **Relação com Pedidos**: Um pedido pode estar vinculado a uma receita através do campo `receita_id`.

### Pedidos
1. **Status do Pedido**: O status segue um fluxo: `'pendente'` → `'aprovado'` / `'em_analise'` → `'em_separacao'` → `'enviado'` → `'entregue'`.
2. **Histórico**: Toda mudança de status deve ser registrada na tabela `pedido_historico`.
3. **Número Único**: Cada pedido possui um `numero_pedido` único.
4. **Canal de Aquisição**: O pedido pode ser feito através de `'associacao'`, `'marca'` ou `'outro'`.

### Produtos
1. **Status**: Produtos podem estar `'ativo'` ou `'inativo'`.
2. **Forma Farmacêutica**: Deve ser uma das opções do enum `forma_farmaceutica`.
3. **Concentrações**: THC e CBD são opcionais e armazenados como TEXT.

### Documentos
1. **Tipos Aceitos**: Documentos podem ser de vários tipos conforme enum `tipo_documento`.
2. **Armazenamento**: URLs dos documentos são armazenadas no campo `arquivo_url`.
3. **Formatos Aceitos**: PDF, PNG, JPG, JPEG (conforme validação frontend).

### Notificações
1. **Leitura**: Quando uma notificação é lida, o campo `lida` deve ser atualizado para `true` e `lida_em` deve ser preenchido.
2. **Preferências**: Usuários podem configurar suas preferências de notificação na tabela `preferencias_notificacoes`.
3. **Destinatários**: Notificações podem ser enviadas para usuários específicos ou grupos (todos, todos médicos, todos pacientes).

### Contadores
1. **Total de Consultas**: O campo `total_consultas` em `pacientes` deve ser atualizado quando uma consulta é realizada.
2. **Total de Pedidos**: O campo `total_pedidos` em `pacientes` deve ser atualizado quando um pedido é criado.

---

## 🔌 APIs e Endpoints

### Autenticação (Supabase Auth)
- **Login**: `supabase.auth.signInWithPassword({ email, password })`
- **Logout**: `supabase.auth.signOut()`
- **Sessão Atual**: `supabase.auth.getSession()`
- **Usuário Atual**: `supabase.auth.getUser()`
- **Recuperar Senha**: `supabase.auth.resetPasswordForEmail(email)`

### Funções RPC (Remote Procedure Calls)

#### Funções Administrativas (Requerem permissão admin)

##### `admin_list_pacientes()`
Lista todos os pacientes.

**Retorno:**
```typescript
{
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string; // DATE format
  endereco_completo: string;
  total_consultas: number;
  total_pedidos: number;
  ultimo_acesso: string; // TIMESTAMP
  created_at: string; // TIMESTAMP
  ativo: boolean;
}[]
```

**Uso:**
```typescript
const { data, error } = await supabase.rpc('admin_list_pacientes');
```

##### `admin_get_paciente(p_id: uuid)`
Obtém dados de um paciente específico.

**Parâmetros:**
- `p_id`: UUID do paciente

**Retorno:**
```typescript
{
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string;
  endereco_completo: string;
  total_consultas: number;
  total_pedidos: number;
  ultimo_acesso: string;
  created_at: string;
  ativo: boolean;
  foto_perfil_url: string;
}[]
```

**Uso:**
```typescript
const { data, error } = await supabase.rpc('admin_get_paciente', {
  p_id: 'uuid-do-paciente'
});
```

##### `admin_update_paciente(p_id, p_telefone?, p_cpf?, p_data_nascimento?, p_endereco_completo?)`
Atualiza dados de um paciente.

**Parâmetros:**
- `p_id`: UUID do paciente (obrigatório)
- `p_telefone`: TEXT (opcional)
- `p_cpf`: TEXT (opcional)
- `p_data_nascimento`: DATE (opcional)
- `p_endereco_completo`: TEXT (opcional)

**Uso:**
```typescript
const { error } = await supabase.rpc('admin_update_paciente', {
  p_id: 'uuid-do-paciente',
  p_telefone: '(11) 99999-9999',
  p_cpf: '123.456.789-00',
  p_data_nascimento: '1990-01-01',
  p_endereco_completo: 'Endereço completo'
});
```

##### `admin_inativar_paciente(p_id: uuid)`
Inativa um paciente.

**Parâmetros:**
- `p_id`: UUID do paciente

**Uso:**
```typescript
const { error } = await supabase.rpc('admin_inativar_paciente', {
  p_id: 'uuid-do-paciente'
});
```

##### `admin_list_receitas()`
Lista todas as receitas.

**Retorno:**
```typescript
{
  id: string;
  numero_receita: string;
  data_emissao: string;
  validade: string;
  status: string;
  paciente_user_id: string;
  paciente_nome: string;
  medico_nome: string;
  pedidos: Json; // Array de pedidos relacionados
}[]
```

##### `admin_get_dashboard_stats()`
Obtém estatísticas do dashboard.

**Retorno:**
```typescript
{
  total_pacientes_ativos: number;
  total_consultas: number;
  total_pedidos_ativos: number;
  total_pedidos_concluidos: number;
  total_medicos_ativos: number;
  total_pedidos_cancelados: number;
}[]
```

### Queries Diretas (Supabase Client)

#### Buscar Perfil do Usuário
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

#### Buscar Paciente por User ID
```typescript
const { data, error } = await supabase
  .from('pacientes')
  .select('*')
  .eq('user_id', userId)
  .single();
```

#### Buscar Receitas do Paciente
```typescript
const { data, error } = await supabase
  .from('receitas')
  .select(`
    *,
    medico:medicos(*),
    receita_itens(
      *,
      produto:produtos(*)
    )
  `)
  .eq('paciente_id', pacienteId)
  .order('data_emissao', { ascending: false });
```

#### Buscar Pedidos do Paciente
```typescript
const { data, error } = await supabase
  .from('pedidos')
  .select(`
    *,
    pedido_itens(
      *,
      produto:produtos(*)
    ),
    receita:receitas(*),
    associacao_marca:associacoes_marcas(*)
  `)
  .eq('paciente_id', pacienteId)
  .order('data_pedido', { ascending: false });
```

#### Buscar Produtos Ativos
```typescript
const { data, error } = await supabase
  .from('produtos')
  .select('*')
  .eq('status', 'ativo')
  .order('nome_comercial');
```

#### Buscar Notificações do Usuário
```typescript
const { data, error } = await supabase
  .from('notificacoes')
  .select('*')
  .eq('destinatario_id', userId)
  .order('data_envio', { ascending: false });
```

#### Marcar Notificação como Lida
```typescript
const { error } = await supabase
  .from('notificacoes')
  .update({
    lida: true,
    lida_em: new Date().toISOString()
  })
  .eq('id', notificacaoId);
```

#### Buscar Preferências de Notificação
```typescript
const { data, error } = await supabase
  .from('preferencias_notificacoes')
  .select('*')
  .eq('user_id', userId)
  .single();
```

#### Atualizar Preferências de Notificação
```typescript
const { error } = await supabase
  .from('preferencias_notificacoes')
  .upsert({
    user_id: userId,
    notif_email: true,
    notif_push: true,
    notif_sms: false,
    tipos_consultas: true,
    tipos_entregas: true,
    tipos_anvisa: true,
    tipos_novas_receitas: true
  });
```

#### Upload de Documento
```typescript
// 1. Upload do arquivo para Supabase Storage
const { data: fileData, error: uploadError } = await supabase.storage
  .from('documentos')
  .upload(`${userId}/${fileName}`, file);

// 2. Obter URL pública
const { data: { publicUrl } } = supabase.storage
  .from('documentos')
  .getPublicUrl(`${userId}/${fileName}`);

// 3. Salvar registro na tabela documentos
const { error } = await supabase
  .from('documentos')
  .insert({
    paciente_id: pacienteId,
    tipo: 'identidade', // ou outro tipo
    nome_arquivo: fileName,
    arquivo_url: publicUrl,
    tamanho_bytes: file.size,
    enviado_por: userId
  });
```

### Realtime Subscriptions

#### Escutar Mudanças em Tabelas
```typescript
const channel = supabase
  .channel('pacientes-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'pacientes',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Mudança detectada:', payload);
    }
  )
  .subscribe();
```

---

## 🔐 Autenticação

### Fluxo de Autenticação

1. **Login**: Usuário faz login com email e senha via Supabase Auth
2. **Sessão**: Supabase mantém a sessão automaticamente (localStorage)
3. **Token**: JWT token é gerenciado automaticamente pelo Supabase
4. **Refresh**: Token é renovado automaticamente

### Verificação de Autenticação

```typescript
// Verificar se usuário está autenticado
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  // Usuário autenticado
  const userId = session.user.id;
}
```

### Obter Dados do Usuário

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const email = user.email;
  const userId = user.id;
}
```

### Verificar Tipo de Usuário

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('tipo_usuario, ativo')
  .eq('id', userId)
  .single();

if (profile?.tipo_usuario === 'paciente' && profile?.ativo) {
  // Usuário é um paciente ativo
}
```

---

## 📊 Estrutura de Dados

### Interface Paciente (TypeScript)
```typescript
interface Paciente {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string; // YYYY-MM-DD
  endereco_completo: string;
  total_consultas: number;
  total_pedidos: number;
  ultimo_acesso: string; // ISO timestamp
  created_at: string; // ISO timestamp
  ativo: boolean;
  foto_perfil_url?: string;
}
```

### Interface Receita
```typescript
interface Receita {
  id: string;
  numero_receita: string;
  medico_id: string;
  paciente_id: string;
  data_emissao: string; // ISO timestamp
  validade: string; // YYYY-MM-DD
  observacoes?: string;
  status: 'ativa' | 'utilizada' | 'expirada' | 'cancelada';
  documento_url?: string;
  created_at: string;
  updated_at: string;
  medico?: {
    nome: string;
    crm: string;
    uf_crm: string;
  };
  receita_itens?: ReceitaItem[];
}

interface ReceitaItem {
  id: string;
  receita_id: string;
  produto_id: string;
  posologia: string;
  quantidade_prescrita: number;
  duracao_tratamento?: string;
  produto?: Produto;
}
```

### Interface Pedido
```typescript
interface Pedido {
  id: string;
  numero_pedido: string;
  receita_id?: string;
  paciente_id: string;
  associacao_marca_id?: string;
  data_pedido: string; // ISO timestamp
  valor_total?: number;
  forma_pagamento?: string;
  status: 'pendente' | 'aprovado' | 'em_analise' | 'recusado' | 'cancelado' | 'em_separacao' | 'enviado' | 'entregue';
  canal_aquisicao: 'associacao' | 'marca' | 'outro';
  created_at: string;
  updated_at: string;
  pedido_itens?: PedidoItem[];
  receita?: Receita;
  associacao_marca?: AssociacaoMarca;
}

interface PedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario?: number;
  preco_total?: number;
  produto?: Produto;
}
```

### Interface Produto
```typescript
interface Produto {
  id: string;
  nome_comercial: string;
  principio_ativo: string;
  concentracao_thc?: string;
  concentracao_cbd?: string;
  forma_farmaceutica: 'oleo' | 'capsula' | 'spray' | 'gel' | 'creme' | 'outro';
  volume_quantidade?: string;
  fabricante?: string;
  associacao_marca_id?: string;
  imagem_url?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}
```

### Interface Notificação
```typescript
interface Notificacao {
  id: string;
  tipo: 'sistema' | 'personalizada';
  categoria: 'financeira' | 'gestao_usuarios' | 'gestao_pedidos' | 'catalogo' | 'alertas_tecnicos' | 'engajamento' | 'riscos' | 'geral';
  titulo: string;
  descricao: string;
  destinatario_id?: string;
  destinatario_tipo: 'todos' | 'todos_medicos' | 'todos_pacientes' | 'especifico';
  tipo_envio: 'imediato' | 'agendado';
  data_envio: string; // ISO timestamp
  lida: boolean;
  lida_em?: string; // ISO timestamp
  created_at: string;
}
```

---

## ✅ Validações

### Validação de CPF
- **Formato**: `XXX.XXX.XXX-XX`
- **Regex**: `/^\d{3}\.\d{3}\.\d{3}-\d{2}$/`
- **Exemplo**: `123.456.789-00`

### Validação de Telefone
- **Formato**: `(XX) XXXXX-XXXX` ou `(XX) XXXX-XXXX`
- **Regex**: `/^\(\d{2}\)\s\d{4,5}-\d{4}$/`
- **Exemplo**: `(11) 99999-9999` ou `(11) 9999-9999`

### Validação de Email
- **Formato**: Email válido
- **Máximo**: 255 caracteres
- **Regex padrão**: Email validation

### Validação de Data de Nascimento
- **Formato**: `YYYY-MM-DD`
- **Regex**: `/^\d{4}-\d{2}-\d{2}$/`
- **Exemplo**: `1990-01-01`

### Validação de CNPJ
- **Formato**: `XX.XXX.XXX/XXXX-XX`
- **Regex**: `/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/`
- **Exemplo**: `12.345.678/0001-90`

### Validação de Nome Completo
- **Mínimo**: 3 caracteres
- **Máximo**: 200 caracteres
- **Trim**: Espaços no início e fim são removidos

### Validação de Endereço
- **Máximo**: 500 caracteres

### Validação de Senha
- **Mínimo**: 6 caracteres
- **Máximo**: 100 caracteres

---

## 📱 Funcionalidades do Módulo Paciente

### Funcionalidades Principais

#### 1. **Perfil do Paciente**
- Visualizar dados pessoais (nome, email, telefone, CPF, data de nascimento, endereço)
- Editar dados pessoais (telefone, CPF, data de nascimento, endereço)
- Visualizar foto de perfil
- Atualizar foto de perfil

#### 2. **Receitas**
- Listar receitas do paciente
- Visualizar detalhes de uma receita
- Ver itens prescritos na receita
- Verificar validade da receita
- Visualizar documento da receita (PDF)
- Filtrar receitas por status

#### 3. **Pedidos**
- Listar pedidos do paciente
- Visualizar detalhes de um pedido
- Ver itens do pedido
- Acompanhar status do pedido
- Ver histórico de mudanças de status
- Filtrar pedidos por status

#### 4. **Produtos**
- Listar produtos disponíveis
- Visualizar detalhes de um produto
- Ver indicações clínicas do produto
- Filtrar produtos por forma farmacêutica
- Buscar produtos por nome

#### 5. **Documentos**
- Listar documentos enviados
- Visualizar documentos
- Fazer upload de novos documentos
- Baixar documentos
- Filtrar documentos por tipo

#### 6. **Notificações**
- Listar notificações recebidas
- Marcar notificação como lida
- Filtrar notificações por categoria
- Configurar preferências de notificação
- Receber notificações push em tempo real

#### 7. **Dashboard/Início**
- Visualizar estatísticas pessoais:
  - Total de consultas realizadas
  - Total de pedidos realizados
  - Receitas ativas
  - Pedidos em andamento
- Ver últimas receitas
- Ver últimos pedidos
- Ver notificações não lidas

### Fluxos de Uso

#### Fluxo: Visualizar Receita
1. Usuário acessa lista de receitas
2. Seleciona uma receita
3. Visualiza detalhes:
   - Número da receita
   - Data de emissão
   - Validade
   - Médico prescritor
   - Status
   - Itens prescritos (produtos, posologia, quantidade)
4. Pode visualizar documento PDF se disponível

#### Fluxo: Acompanhar Pedido
1. Usuário acessa lista de pedidos
2. Seleciona um pedido
3. Visualiza detalhes:
   - Número do pedido
   - Data do pedido
   - Status atual
   - Itens do pedido
   - Valor total
   - Histórico de mudanças de status
4. Recebe notificações quando status muda

#### Fluxo: Upload de Documento
1. Usuário acessa seção de documentos
2. Seleciona tipo de documento
3. Faz upload do arquivo (PDF, PNG, JPG)
4. Sistema valida formato e tamanho
5. Arquivo é enviado para Supabase Storage
6. Registro é criado na tabela `documentos`

### Permissões e Acesso

#### Acesso do Paciente
- **Pode acessar**: Apenas seus próprios dados
- **Pode editar**: Seus próprios dados pessoais (telefone, CPF, data de nascimento, endereço)
- **Pode visualizar**: Suas receitas, pedidos, documentos e notificações
- **Não pode acessar**: Dados de outros pacientes, funções administrativas

#### Row Level Security (RLS)
O Supabase implementa RLS para garantir que pacientes só acessem seus próprios dados. As políticas devem ser configuradas no banco de dados.

### Notificações Push

#### Tipos de Notificações para Paciente
- **Consultas**: Lembretes de consultas agendadas
- **Entregas**: Atualizações sobre status de pedidos/entregas
- **ANVISA**: Alertas relacionados à ANVISA
- **Novas Receitas**: Quando uma nova receita é emitida
- **Sistema**: Notificações gerais do sistema

#### Configuração de Preferências
O paciente pode configurar:
- Receber notificações por email (sim/não)
- Receber notificações por SMS (sim/não)
- Receber notificações push (sim/não)
- Tipos de notificações que deseja receber

---

## 📝 Notas Importantes

### Formato de Datas
- **API**: Sempre usar formato ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Exibição**: Formato brasileiro (`DD/MM/YYYY` ou `DD/MM/YYYY • HH:mm`)
- **Timezone**: Todas as datas são armazenadas com timezone (TIMESTAMP WITH TIME ZONE)

### Formato de Valores Monetários
- **Armazenamento**: DECIMAL(10,2) no banco
- **Exibição**: Formato brasileiro (`R$ 1.234,56`)

### Upload de Arquivos
- **Tamanho máximo**: Verificar limites do Supabase Storage
- **Formatos aceitos**: PDF, PNG, JPG, JPEG
- **Estrutura de pastas**: `{userId}/{fileName}`

### Paginação
- **Padrão**: 10 itens por página
- **Navegação**: Primeira, anterior, próxima, última página

### Busca e Filtros
- **Busca**: Por nome, email, CPF
- **Filtros**: Por status, período, categoria

---

## 🔗 Recursos Adicionais

### Documentação Supabase
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Client](https://supabase.com/docs/reference/javascript/introduction)

### Estrutura de Pastas Recomendada (Mobile)
```
src/
├── screens/          # Telas da aplicação
├── components/       # Componentes reutilizáveis
├── services/        # Serviços de API (Supabase)
├── hooks/           # Custom hooks
├── utils/           # Utilitários e validações
├── types/           # Tipos TypeScript/Interfaces
├── navigation/      # Navegação
└── constants/       # Constantes (cores, textos, etc)
```

---

**Última atualização**: Dezembro 2024
**Versão do documento**: 1.0


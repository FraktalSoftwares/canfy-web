export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      associacoes_marcas: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          regiao: string | null
          status: Database["public"]["Enums"]["status_generico"]
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          regiao?: string | null
          status?: Database["public"]["Enums"]["status_generico"]
          telefone?: string | null
          tipo: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          regiao?: string | null
          status?: Database["public"]["Enums"]["status_generico"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          arquivo_url: string
          created_at: string
          enviado_por: string | null
          id: string
          medico_id: string | null
          nome_arquivo: string
          paciente_id: string | null
          tamanho_bytes: number | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          medico_id?: string | null
          nome_arquivo: string
          paciente_id?: string | null
          tamanho_bytes?: number | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          enviado_por?: string | null
          id?: string
          medico_id?: string | null
          nome_arquivo?: string
          paciente_id?: string | null
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
        }
        Relationships: [
          {
            foreignKeyName: "documentos_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      indicacoes_clinicas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      logs_auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: unknown
          registro_id: string | null
          tabela_afetada: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown
          registro_id?: string | null
          tabela_afetada: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown
          registro_id?: string | null
          tabela_afetada?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          created_at: string
          crm: string
          email: string
          especialidade_id: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["status_medico"]
          telefone: string | null
          total_atendimentos: number
          uf_crm: string
          ultimo_acesso: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          crm: string
          email: string
          especialidade_id?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["status_medico"]
          telefone?: string | null
          total_atendimentos?: number
          uf_crm: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          crm?: string
          email?: string
          especialidade_id?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["status_medico"]
          telefone?: string | null
          total_atendimentos?: number
          uf_crm?: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicos_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_diarias: {
        Row: {
          created_at: string
          data: string
          id: string
          total_consultas_realizadas: number
          total_medicos_ativos: number
          total_pacientes_ativos: number
          total_pedidos_ativos: number
          total_pedidos_concluidos: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          total_consultas_realizadas?: number
          total_medicos_ativos?: number
          total_pacientes_ativos?: number
          total_pedidos_ativos?: number
          total_pedidos_concluidos?: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          total_consultas_realizadas?: number
          total_medicos_ativos?: number
          total_pacientes_ativos?: number
          total_pedidos_ativos?: number
          total_pedidos_concluidos?: number
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_notificacao"]
          created_at: string
          data_envio: string
          descricao: string
          destinatario_id: string | null
          destinatario_tipo: Database["public"]["Enums"]["destinatario_tipo"]
          id: string
          lida: boolean
          lida_em: string | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          tipo_envio: Database["public"]["Enums"]["tipo_envio"]
          titulo: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_notificacao"]
          created_at?: string
          data_envio?: string
          descricao: string
          destinatario_id?: string | null
          destinatario_tipo?: Database["public"]["Enums"]["destinatario_tipo"]
          id?: string
          lida?: boolean
          lida_em?: string | null
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          tipo_envio?: Database["public"]["Enums"]["tipo_envio"]
          titulo: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_notificacao"]
          created_at?: string
          data_envio?: string
          descricao?: string
          destinatario_id?: string | null
          destinatario_tipo?: Database["public"]["Enums"]["destinatario_tipo"]
          id?: string
          lida?: boolean
          lida_em?: string | null
          tipo?: Database["public"]["Enums"]["tipo_notificacao"]
          tipo_envio?: Database["public"]["Enums"]["tipo_envio"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          cpf: string
          created_at: string
          data_nascimento: string
          endereco_completo: string | null
          id: string
          total_consultas: number
          total_pedidos: number
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          data_nascimento: string
          endereco_completo?: string | null
          id?: string
          total_consultas?: number
          total_pedidos?: number
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_nascimento?: string
          endereco_completo?: string | null
          id?: string
          total_consultas?: number
          total_pedidos?: number
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_historico: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          pedido_id: string
          responsavel_id: string | null
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          pedido_id: string
          responsavel_id?: string | null
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          pedido_id?: string
          responsavel_id?: string | null
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_historico_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          preco_total: number | null
          preco_unitario: number | null
          produto_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          preco_total?: number | null
          preco_unitario?: number | null
          produto_id: string
          quantidade: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          preco_total?: number | null
          preco_unitario?: number | null
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          associacao_marca_id: string | null
          canal_aquisicao: Database["public"]["Enums"]["canal_aquisicao"]
          created_at: string
          data_pedido: string
          forma_pagamento: string | null
          id: string
          numero_pedido: string
          paciente_id: string
          receita_id: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          associacao_marca_id?: string | null
          canal_aquisicao?: Database["public"]["Enums"]["canal_aquisicao"]
          created_at?: string
          data_pedido?: string
          forma_pagamento?: string | null
          id?: string
          numero_pedido: string
          paciente_id: string
          receita_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          associacao_marca_id?: string | null
          canal_aquisicao?: Database["public"]["Enums"]["canal_aquisicao"]
          created_at?: string
          data_pedido?: string
          forma_pagamento?: string | null
          id?: string
          numero_pedido?: string
          paciente_id?: string
          receita_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_associacao_marca_id_fkey"
            columns: ["associacao_marca_id"]
            isOneToOne: false
            referencedRelation: "associacoes_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias_notificacoes: {
        Row: {
          id: string
          notif_email: boolean
          notif_push: boolean
          notif_sms: boolean
          tipos_anvisa: boolean
          tipos_consultas: boolean
          tipos_entregas: boolean
          tipos_novas_receitas: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notif_email?: boolean
          notif_push?: boolean
          notif_sms?: boolean
          tipos_anvisa?: boolean
          tipos_consultas?: boolean
          tipos_entregas?: boolean
          tipos_novas_receitas?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notif_email?: boolean
          notif_push?: boolean
          notif_sms?: boolean
          tipos_anvisa?: boolean
          tipos_consultas?: boolean
          tipos_entregas?: boolean
          tipos_novas_receitas?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_indicacoes: {
        Row: {
          created_at: string
          id: string
          indicacao_id: string
          produto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicacao_id: string
          produto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicacao_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_indicacoes_indicacao_id_fkey"
            columns: ["indicacao_id"]
            isOneToOne: false
            referencedRelation: "indicacoes_clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_indicacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          associacao_marca_id: string | null
          concentracao_cbd: string | null
          concentracao_thc: string | null
          created_at: string
          fabricante: string | null
          forma_farmaceutica: Database["public"]["Enums"]["forma_farmaceutica"]
          id: string
          imagem_url: string | null
          nome_comercial: string
          principio_ativo: string
          status: Database["public"]["Enums"]["status_generico"]
          updated_at: string
          volume_quantidade: string | null
        }
        Insert: {
          associacao_marca_id?: string | null
          concentracao_cbd?: string | null
          concentracao_thc?: string | null
          created_at?: string
          fabricante?: string | null
          forma_farmaceutica: Database["public"]["Enums"]["forma_farmaceutica"]
          id?: string
          imagem_url?: string | null
          nome_comercial: string
          principio_ativo: string
          status?: Database["public"]["Enums"]["status_generico"]
          updated_at?: string
          volume_quantidade?: string | null
        }
        Update: {
          associacao_marca_id?: string | null
          concentracao_cbd?: string | null
          concentracao_thc?: string | null
          created_at?: string
          fabricante?: string | null
          forma_farmaceutica?: Database["public"]["Enums"]["forma_farmaceutica"]
          id?: string
          imagem_url?: string | null
          nome_comercial?: string
          principio_ativo?: string
          status?: Database["public"]["Enums"]["status_generico"]
          updated_at?: string
          volume_quantidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_associacao_marca_id_fkey"
            columns: ["associacao_marca_id"]
            isOneToOne: false
            referencedRelation: "associacoes_marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          foto_perfil_url: string | null
          id: string
          nome_completo: string
          telefone: string | null
          tipo_usuario: Database["public"]["Enums"]["tipo_usuario"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          foto_perfil_url?: string | null
          id: string
          nome_completo: string
          telefone?: string | null
          tipo_usuario?: Database["public"]["Enums"]["tipo_usuario"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          foto_perfil_url?: string | null
          id?: string
          nome_completo?: string
          telefone?: string | null
          tipo_usuario?: Database["public"]["Enums"]["tipo_usuario"]
          updated_at?: string
        }
        Relationships: []
      }
      receita_itens: {
        Row: {
          created_at: string
          duracao_tratamento: string | null
          id: string
          posologia: string
          produto_id: string
          quantidade_prescrita: number
          receita_id: string
        }
        Insert: {
          created_at?: string
          duracao_tratamento?: string | null
          id?: string
          posologia: string
          produto_id: string
          quantidade_prescrita: number
          receita_id: string
        }
        Update: {
          created_at?: string
          duracao_tratamento?: string | null
          id?: string
          posologia?: string
          produto_id?: string
          quantidade_prescrita?: number
          receita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receita_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          created_at: string
          data_emissao: string
          documento_url: string | null
          id: string
          medico_id: string
          numero_receita: string
          observacoes: string | null
          paciente_id: string
          status: Database["public"]["Enums"]["status_receita"]
          updated_at: string
          validade: string
        }
        Insert: {
          created_at?: string
          data_emissao?: string
          documento_url?: string | null
          id?: string
          medico_id: string
          numero_receita: string
          observacoes?: string | null
          paciente_id: string
          status?: Database["public"]["Enums"]["status_receita"]
          updated_at?: string
          validade: string
        }
        Update: {
          created_at?: string
          data_emissao?: string
          documento_url?: string | null
          id?: string
          medico_id?: string
          numero_receita?: string
          observacoes?: string | null
          paciente_id?: string
          status?: Database["public"]["Enums"]["status_receita"]
          updated_at?: string
          validade?: string
        }
        Relationships: [
          {
            foreignKeyName: "receitas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          modulo: string
          pode_acessar: boolean
          pode_editar: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modulo: string
          pode_acessar?: boolean
          pode_editar?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modulo?: string
          pode_acessar?: boolean
          pode_editar?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_associacao: {
        Args: {
          p_cidade?: string
          p_cnpj?: string
          p_email?: string
          p_endereco?: string
          p_estado?: string
          p_nome: string
          p_observacoes?: string
          p_regiao?: string
          p_telefone?: string
          p_tipo: string
        }
        Returns: string
      }
      admin_fix_missing_pacientes: {
        Args: never
        Returns: {
          email: string
          status: string
          user_id: string
        }[]
      }
      admin_get_associacao: {
        Args: { p_id: string }
        Returns: {
          cidade: string
          cnpj: string
          created_at: string
          email: string
          endereco: string
          estado: string
          id: string
          nome: string
          observacoes: string
          regiao: string
          status: string
          telefone: string
          tipo: string
          updated_at: string
        }[]
      }
      admin_get_dashboard_stats: {
        Args: never
        Returns: {
          total_consultas: number
          total_medicos_ativos: number
          total_pacientes_ativos: number
          total_pedidos_ativos: number
          total_pedidos_cancelados: number
          total_pedidos_concluidos: number
        }[]
      }
      admin_get_medico: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          crm: string
          email: string
          especialidade_nome: string
          id: string
          nome: string
          status: string
          telefone: string
          total_atendimentos: number
          uf_crm: string
          ultimo_acesso: string
          user_id: string
        }[]
      }
      admin_get_monthly_pedidos: {
        Args: { p_year: number }
        Returns: {
          count: number
          month: number
          month_name: string
        }[]
      }
      admin_get_monthly_receitas: {
        Args: { p_year: number }
        Returns: {
          count: number
          month: number
          month_name: string
        }[]
      }
      admin_get_paciente: {
        Args: { p_id: string }
        Returns: {
          ativo: boolean
          cpf: string
          created_at: string
          data_nascimento: string
          email: string
          endereco_completo: string
          foto_perfil_url: string
          id: string
          nome_completo: string
          telefone: string
          total_consultas: number
          total_pedidos: number
          ultimo_acesso: string
          user_id: string
        }[]
      }
      admin_get_recent_medicos: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          crm: string
          email: string
          id: string
          nome: string
          status: string
          uf_crm: string
        }[]
      }
      admin_get_recent_pedidos: {
        Args: { p_limit?: number }
        Returns: {
          data_pedido: string
          id: string
          numero_pedido: string
          paciente_nome: string
          status: string
        }[]
      }
      admin_inativar_associacao: { Args: { p_id: string }; Returns: undefined }
      admin_inativar_medico: { Args: { p_id: string }; Returns: undefined }
      admin_inativar_paciente: { Args: { p_id: string }; Returns: undefined }
      admin_list_associacoes: {
        Args: never
        Returns: {
          cidade: string
          cnpj: string
          created_at: string
          email: string
          endereco: string
          estado: string
          id: string
          nome: string
          observacoes: string
          regiao: string
          status: string
          telefone: string
          tipo: string
          updated_at: string
        }[]
      }
      admin_list_medicos: {
        Args: never
        Returns: {
          created_at: string
          crm: string
          email: string
          especialidade_nome: string
          id: string
          nome: string
          status: string
          telefone: string
          total_atendimentos: number
          uf_crm: string
          ultimo_acesso: string
        }[]
      }
      admin_list_pacientes: {
        Args: never
        Returns: {
          ativo: boolean
          cpf: string
          created_at: string
          data_nascimento: string
          email: string
          endereco_completo: string
          id: string
          nome_completo: string
          telefone: string
          total_consultas: number
          total_pedidos: number
          ultimo_acesso: string
          user_id: string
        }[]
      }
      admin_list_receitas: {
        Args: never
        Returns: {
          data_emissao: string
          id: string
          medico_nome: string
          numero_receita: string
          paciente_nome: string
          paciente_user_id: string
          pedidos: Json
          status: string
          validade: string
        }[]
      }
      admin_update_associacao: {
        Args: {
          p_cnpj?: string
          p_email?: string
          p_id: string
          p_nome: string
          p_observacoes?: string
          p_regiao?: string
          p_telefone?: string
        }
        Returns: undefined
      }
      admin_update_medico: {
        Args: {
          p_crm: string
          p_email: string
          p_id: string
          p_telefone: string
          p_uf_crm: string
        }
        Returns: undefined
      }
      admin_update_paciente: {
        Args: {
          p_cpf?: string
          p_data_nascimento?: string
          p_endereco_completo?: string
          p_id: string
          p_telefone?: string
        }
        Returns: undefined
      }
      assign_admin_role: { Args: { user_email: string }; Returns: undefined }
      create_produto: {
        Args: {
          p_concentracao_cbd: string
          p_concentracao_thc: string
          p_fabricante: string
          p_forma_farmaceutica: string
          p_imagem_url: string
          p_nome_comercial: string
          p_principio_ativo: string
          p_status: string
          p_volume_quantidade: string
        }
        Returns: string
      }
      gerar_numero_pedido: { Args: never; Returns: string }
      gerar_numero_receita: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inativar_produto: { Args: { p_produto_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "gestor" | "visualizador"
      canal_aquisicao: "associacao" | "marca" | "outro"
      categoria_notificacao:
        | "financeira"
        | "gestao_usuarios"
        | "gestao_pedidos"
        | "catalogo"
        | "alertas_tecnicos"
        | "engajamento"
        | "riscos"
        | "geral"
      destinatario_tipo:
        | "todos"
        | "todos_medicos"
        | "todos_pacientes"
        | "especifico"
      forma_farmaceutica:
        | "oleo"
        | "capsula"
        | "spray"
        | "gel"
        | "creme"
        | "outro"
      status_generico: "ativo" | "inativo"
      status_medico: "ativo" | "inativo" | "pendente_aprovacao"
      status_pedido:
        | "pendente"
        | "aprovado"
        | "em_analise"
        | "recusado"
        | "cancelado"
        | "em_separacao"
        | "enviado"
        | "entregue"
      status_receita: "ativa" | "utilizada" | "expirada" | "cancelada"
      tipo_documento:
        | "laudo_medico"
        | "exame"
        | "identidade"
        | "comprovante_residencia"
        | "autorizacao_anvisa"
        | "outro"
      tipo_envio: "imediato" | "agendado"
      tipo_fornecedor: "associacao" | "marca"
      tipo_notificacao: "sistema" | "personalizada"
      tipo_usuario: "admin" | "medico" | "paciente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "gestor", "visualizador"],
      canal_aquisicao: ["associacao", "marca", "outro"],
      categoria_notificacao: [
        "financeira",
        "gestao_usuarios",
        "gestao_pedidos",
        "catalogo",
        "alertas_tecnicos",
        "engajamento",
        "riscos",
        "geral",
      ],
      destinatario_tipo: [
        "todos",
        "todos_medicos",
        "todos_pacientes",
        "especifico",
      ],
      forma_farmaceutica: ["oleo", "capsula", "spray", "gel", "creme", "outro"],
      status_generico: ["ativo", "inativo"],
      status_medico: ["ativo", "inativo", "pendente_aprovacao"],
      status_pedido: [
        "pendente",
        "aprovado",
        "em_analise",
        "recusado",
        "cancelado",
        "em_separacao",
        "enviado",
        "entregue",
      ],
      status_receita: ["ativa", "utilizada", "expirada", "cancelada"],
      tipo_documento: [
        "laudo_medico",
        "exame",
        "identidade",
        "comprovante_residencia",
        "autorizacao_anvisa",
        "outro",
      ],
      tipo_envio: ["imediato", "agendado"],
      tipo_fornecedor: ["associacao", "marca"],
      tipo_notificacao: ["sistema", "personalizada"],
      tipo_usuario: ["admin", "medico", "paciente"],
    },
  },
} as const

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
      blog_posts: {
        Row: {
          id: string
          titulo: string
          slug: string
          resumo: string | null
          conteudo: string
          capa_url: string | null
          status: "rascunho" | "publicado" | "agendado" | "arquivado"
          data_publicacao: string | null
          autor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          slug: string
          resumo?: string | null
          conteudo: string
          capa_url?: string | null
          status?: "rascunho" | "publicado" | "agendado" | "arquivado"
          data_publicacao?: string | null
          autor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          slug?: string
          resumo?: string | null
          conteudo?: string
          capa_url?: string | null
          status?: "rascunho" | "publicado" | "agendado" | "arquivado"
          data_publicacao?: string | null
          autor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          documentos_obrigatorios: string[]
          produtos_ids: string[]
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
          documentos_obrigatorios?: string[]
          produtos_ids?: string[]
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
          documentos_obrigatorios?: string[]
          produtos_ids?: string[]
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
          endereco_profissional: string | null
          especialidade_id: string | null
          etapa_validacao: number | null
          id: string
          motivo_recusa: string | null
          nome: string
          observacoes_admin: string | null
          status: Database["public"]["Enums"]["status_medico"]
          status_validacao: "em_analise" | "incompleto" | "aprovado" | "recusado" | null
          telefone: string | null
          tempo_atuacao_anos: number | null
          total_atendimentos: number
          total_receitas: number
          uf_crm: string
          ultimo_acesso: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          crm: string
          email: string
          endereco_profissional?: string | null
          especialidade_id?: string | null
          etapa_validacao?: number | null
          id?: string
          motivo_recusa?: string | null
          nome: string
          observacoes_admin?: string | null
          status?: Database["public"]["Enums"]["status_medico"]
          status_validacao?: "em_analise" | "incompleto" | "aprovado" | "recusado" | null
          telefone?: string | null
          tempo_atuacao_anos?: number | null
          total_atendimentos?: number
          total_receitas?: number
          uf_crm: string
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          crm?: string
          email?: string
          endereco_profissional?: string | null
          especialidade_id?: string | null
          etapa_validacao?: number | null
          id?: string
          motivo_recusa?: string | null
          nome?: string
          observacoes_admin?: string | null
          status?: Database["public"]["Enums"]["status_medico"]
          status_validacao?: "em_analise" | "incompleto" | "aprovado" | "recusado" | null
          telefone?: string | null
          tempo_atuacao_anos?: number | null
          total_atendimentos?: number
          total_receitas?: number
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
          genero: string | null
          id: string
          observacoes_admin: string | null
          total_consultas: number
          total_pedidos: number
          total_receitas: number
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          data_nascimento: string
          endereco_completo?: string | null
          genero?: string | null
          id?: string
          observacoes_admin?: string | null
          total_consultas?: number
          total_pedidos?: number
          total_receitas?: number
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_nascimento?: string
          endereco_completo?: string | null
          genero?: string | null
          id?: string
          observacoes_admin?: string | null
          total_consultas?: number
          total_pedidos?: number
          total_receitas?: number
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
          status_anvisa: "nao_solicitado" | "em_analise" | "aprovado" | "recusado"
          codigo_rastreio: string | null
          rastreio_atualizado_em: string | null
          prazo_entrega_inicio: string | null
          prazo_entrega_fim: string | null
          melhor_envio_servico_id: number | null
          melhor_envio_order_id: string | null
          melhor_envio_etiqueta_url: string | null
          frete_valor: number | null
          prazo_entrega_dias: number | null
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
          status_anvisa?: "nao_solicitado" | "em_analise" | "aprovado" | "recusado"
          codigo_rastreio?: string | null
          rastreio_atualizado_em?: string | null
          prazo_entrega_inicio?: string | null
          prazo_entrega_fim?: string | null
          melhor_envio_servico_id?: number | null
          melhor_envio_order_id?: string | null
          melhor_envio_etiqueta_url?: string | null
          frete_valor?: number | null
          prazo_entrega_dias?: number | null
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
          status_anvisa?: "nao_solicitado" | "em_analise" | "aprovado" | "recusado"
          codigo_rastreio?: string | null
          rastreio_atualizado_em?: string | null
          prazo_entrega_inicio?: string | null
          prazo_entrega_fim?: string | null
          melhor_envio_servico_id?: number | null
          melhor_envio_order_id?: string | null
          melhor_envio_etiqueta_url?: string | null
          frete_valor?: number | null
          prazo_entrega_dias?: number | null
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
          tipo_origem: "nacional" | "internacional"
          preco_brl: number | null
          preco_usd: number | null
          updated_at: string
          volume_quantidade: string | null
          peso_g: number
          largura_cm: number
          altura_cm: number
          comprimento_cm: number
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
          tipo_origem?: "nacional" | "internacional"
          preco_brl?: number | null
          preco_usd?: number | null
          updated_at?: string
          volume_quantidade?: string | null
          peso_g?: number
          largura_cm?: number
          altura_cm?: number
          comprimento_cm?: number
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
          tipo_origem?: "nacional" | "internacional"
          preco_brl?: number | null
          preco_usd?: number | null
          updated_at?: string
          volume_quantidade?: string | null
          peso_g?: number
          largura_cm?: number
          altura_cm?: number
          comprimento_cm?: number
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
        Args: { p_year?: number; p_month?: number }
        Returns: {
          receitas_emitidas: number
          pedidos_realizados: number
          aprovacoes_anvisa: number
          produtos_catalogo: number
          medicos_ativos: number
          pacientes_ativos: number
          associacoes_ativas: number
        }[]
      }
      admin_get_pedido_detalhes: {
        Args: { p_id: string }
        Returns: {
          id: string
          numero_pedido: string
          status: string
          status_anvisa: "nao_solicitado" | "em_analise" | "aprovado" | "recusado"
          valor_total: number | null
          canal_aquisicao: string
          data_pedido: string
          codigo_rastreio: string | null
          rastreio_atualizado_em: string | null
          prazo_entrega_inicio: string | null
          prazo_entrega_fim: string | null
          receita_id: string | null
          numero_receita: string | null
          data_emissao: string | null
          paciente_id: string
          paciente_nome: string
          medico_nome: string | null
          documentos: Array<{
            id: string
            tipo: string
            nome_arquivo: string
            arquivo_url: string
          }> | null
          historico: Array<{
            status_anterior: string | null
            status_novo: string
            observacao: string | null
            created_at: string
          }> | null
        }[]
      }
      admin_update_pedido_anvisa: {
        Args: { p_id: string; p_status_anvisa: string; p_observacao?: string | null }
        Returns: undefined
      }
      admin_get_recent_anvisa: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          numero_pedido: string
          paciente_nome: string
          status_anvisa: "nao_solicitado" | "em_analise" | "aprovado" | "recusado"
          data_pedido: string
        }[]
      }
      admin_get_medico: {
        Args: { p_id: string }
        Returns: {
          created_at: string
          cpf: string | null
          crm: string
          email: string
          endereco_profissional: string | null
          especialidade_nome: string
          foto_perfil_url: string | null
          id: string
          nome: string
          observacoes_admin: string | null
          status: string
          telefone: string
          tempo_atuacao_anos: number | null
          total_atendimentos: number
          total_ausencias: number
          total_receitas: number
          uf_crm: string
          ultimo_acesso: string
          user_id: string | null
        }[]
      }
      admin_get_medico_documentos: {
        Args: { p_medico_id: string }
        Returns: {
          id: string
          tipo: string
          nome_arquivo: string
          arquivo_url: string
          created_at: string
        }[]
      }
      admin_upsert_medico_documento: {
        Args: {
          p_medico_id: string
          p_tipo: string
          p_nome_arquivo: string
          p_arquivo_url: string
        }
        Returns: string
      }
      admin_delete_medico_documento: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_get_medico_atendimentos: {
        Args: { p_medico_id: string; p_limit?: number }
        Returns: {
          id: string
          data_consulta: string
          status: string
          queixa_principal: string | null
          paciente_nome: string
          receita_id: string | null
          cancelada_por: string | null
          motivo_cancelamento: string | null
        }[]
      }
      admin_get_medico_receitas: {
        Args: { p_medico_id: string; p_limit?: number }
        Returns: {
          id: string
          numero_receita: string
          data_emissao: string
          validade: string | null
          status: string
          paciente_nome: string
          documento_url: string | null
        }[]
      }
      admin_register_medico_ausencia: {
        Args: { p_medico_id: string; p_consulta_id?: string | null; p_motivo?: string | null }
        Returns: undefined
      }
      admin_reset_medico_ausencias: {
        Args: { p_medico_id?: string | null }
        Returns: number
      }
      admin_get_medico_repasses: {
        Args: { p_medico_id: string }
        Returns: {
          id: string
          data_repasse: string
          valor: number
          status: string
          observacao: string | null
        }[]
      }
      admin_update_medico_observacoes: {
        Args: { p_id: string; p_observacoes: string }
        Returns: undefined
      }
      admin_get_configuracoes_sistema: {
        Args: never
        Returns: {
          percentual_comissao_medico: number
          valor_consulta_padrao: number
          taxa_pedido: number
          frete_internacional: number
          prazo_entrega_internacional_dias: number
          feriados: string[]
          melhor_envio_cep_origem: string
          melhor_envio_sandbox: boolean
          melhor_envio_remetente: Json
          updated_at: string
        }[]
      }
      admin_update_configuracoes_sistema: {
        Args: {
          p_percentual_comissao: number
          p_valor_consulta: number
          p_taxa_pedido: number
          p_frete_intl: number
          p_prazo_intl: number
          p_feriados: string[]
          p_me_cep_origem?: string | null
          p_me_sandbox?: boolean | null
          p_me_remetente?: Json | null
        }
        Returns: undefined
      }
      get_melhor_envio_config: {
        Args: { p_associacao_id?: string | null }
        Returns: {
          cep_origem: string
          sandbox: boolean
          remetente: Json
        }[]
      }
      admin_list_blog_posts: {
        Args: never
        Returns: {
          id: string
          titulo: string
          slug: string
          resumo: string | null
          status: "rascunho" | "publicado" | "agendado" | "arquivado"
          data_publicacao: string | null
          autor_nome: string | null
          created_at: string
          capa_url: string | null
        }[]
      }
      admin_upsert_blog_post: {
        Args: {
          p_id: string | null
          p_titulo: string
          p_slug: string
          p_resumo: string | null
          p_conteudo: string
          p_capa_url: string | null
          p_status: string
          p_data_publicacao: string | null
        }
        Returns: string
      }
      admin_delete_blog_post: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_list_feedbacks: {
        Args: { p_nota_min?: number }
        Returns: {
          id: string
          nota: number
          comentario: string | null
          paciente_nome: string
          medico_nome: string | null
          data_consulta: string | null
          created_at: string
        }[]
      }
      admin_get_feedbacks_resumo: {
        Args: never
        Returns: {
          total: number
          media_geral: number
          notas_baixas: number
        }[]
      }
      admin_aprovar_pedido: {
        Args: { p_id: string; p_observacao?: string | null }
        Returns: undefined
      }
      admin_recusar_pedido: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      admin_update_pedido_entrega: {
        Args: {
          p_id: string
          p_status?: string | null
          p_codigo_rastreio?: string | null
          p_prazo_entrega_inicio?: string | null
          p_prazo_entrega_fim?: string | null
          p_observacao?: string | null
        }
        Returns: undefined
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
          rg: string | null
          created_at: string
          data_nascimento: string
          email: string
          endereco_completo: string
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_complemento: string | null
          bairro: string | null
          cidade: string | null
          estado: string | null
          cep: string | null
          sexo: string | null
          foto_perfil_url: string | null
          genero: string | null
          id: string
          nome_completo: string
          observacoes_admin: string | null
          telefone: string
          total_consultas: number
          total_pedidos: number
          total_receitas: number
          ultimo_acesso: string
          user_id: string
        }[]
      }
      admin_get_paciente_pagamentos: {
        Args: { p_paciente_id: string }
        Returns: {
          data_pagamento: string
          tipo: string
          valor: number
          referencia: string
        }[]
      }
      admin_get_paciente_documentos: {
        Args: { p_paciente_id: string }
        Returns: {
          id: string
          tipo: string
          nome_arquivo: string
          arquivo_url: string
          categoria: "usuario" | "produto"
          created_at: string
        }[]
      }
      admin_get_paciente_consultas: {
        Args: { p_paciente_id: string; p_limit?: number }
        Returns: {
          id: string
          data_consulta: string
          status: string
          queixa_principal: string | null
          medico_nome: string | null
          receita_id: string | null
        }[]
      }
      admin_get_paciente_receitas: {
        Args: { p_paciente_id: string; p_limit?: number }
        Returns: {
          id: string
          numero_receita: string
          data_emissao: string
          validade: string | null
          status: string
          medico_nome: string
          documento_url: string | null
        }[]
      }
      admin_get_paciente_pedidos: {
        Args: { p_paciente_id: string; p_limit?: number }
        Returns: {
          id: string
          numero_pedido: string
          data_pedido: string
          valor_total: number
          status: string
          status_anvisa: string | null
          canal_aquisicao: string | null
        }[]
      }
      admin_get_paciente_prontuarios: {
        Args: { p_paciente_id: string; p_limit?: number }
        Returns: {
          id: string
          consulta_id: string | null
          medico_nome: string | null
          status: string
          arquivo_url: string | null
          created_at: string
        }[]
      }
      admin_get_paciente_anamnese: {
        Args: { p_paciente_id: string }
        Returns: {
          peso: number | null
          altura: number | null
          tem_alergias: boolean | null
          alergias_detalhes: string | null
          tem_tratamentos_anteriores: boolean | null
          tratamentos_anteriores_detalhes: string | null
          tem_comorbidades: boolean | null
          comorbidades_detalhes: string | null
          tem_medicacoes_atuais: boolean | null
          medicacoes_atuais_detalhes: string | null
          tem_exames_recentes: boolean | null
          exames_recentes_detalhes: string | null
          produtos_cannabis_utilizados: string | null
          tem_reacoes_adversas: boolean | null
          reacoes_adversas_detalhes: string | null
          updated_at: string
        }[]
      }
      admin_upsert_paciente_anamnese: {
        Args: {
          p_paciente_id: string
          p_peso?: number | null
          p_altura?: number | null
          p_tem_alergias?: boolean | null
          p_alergias_detalhes?: string | null
          p_tem_tratamentos_anteriores?: boolean | null
          p_tratamentos_anteriores_detalhes?: string | null
          p_tem_comorbidades?: boolean | null
          p_comorbidades_detalhes?: string | null
          p_tem_medicacoes_atuais?: boolean | null
          p_medicacoes_atuais_detalhes?: string | null
          p_tem_exames_recentes?: boolean | null
          p_exames_recentes_detalhes?: string | null
          p_produtos_cannabis_utilizados?: string | null
          p_tem_reacoes_adversas?: boolean | null
          p_reacoes_adversas_detalhes?: string | null
        }
        Returns: undefined
      }
      admin_update_paciente_observacoes: {
        Args: { p_id: string; p_observacoes: string }
        Returns: undefined
      }
      admin_list_medicos_solicitacoes: {
        Args: never
        Returns: {
          id: string
          nome: string
          email: string
          telefone: string
          cpf: string | null
          crm: string
          uf_crm: string
          especialidade_nome: string
          total_atendimentos: number
          ultimo_acesso: string | null
          foto_perfil_url: string | null
          status_validacao: "em_analise" | "incompleto" | "aprovado" | "recusado"
          etapa_validacao: number
          created_at: string
        }[]
      }
      admin_aprovar_medico: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_recusar_medico: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      admin_get_recent_medicos: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          crm: string
          email: string
          foto_perfil_url: string | null
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
          cpf: string | null
          created_at: string
          crm: string
          email: string
          especialidade_nome: string
          id: string
          nome: string
          status: string
          telefone: string
          total_atendimentos: number
          total_ausencias: number
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
          p_cpf?: string | null
          p_email: string
          p_id: string
          p_telefone: string
          p_uf_crm: string
        }
        Returns: undefined
      }
      admin_update_paciente: {
        Args: {
          p_id: string
          p_telefone?: string | null
          p_cpf?: string | null
          p_data_nascimento?: string | null
          p_endereco_completo?: string | null
          p_rg?: string | null
          p_endereco_logradouro?: string | null
          p_endereco_numero?: string | null
          p_endereco_complemento?: string | null
          p_bairro?: string | null
          p_cidade?: string | null
          p_estado?: string | null
          p_cep?: string | null
          p_sexo?: string | null
          p_genero?: string | null
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
          p_peso_g?: number
          p_largura_cm?: number
          p_altura_cm?: number
          p_comprimento_cm?: number
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

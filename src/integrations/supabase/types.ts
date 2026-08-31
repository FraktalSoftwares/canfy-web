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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      asaas_customers: {
        Row: {
          asaas_customer_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asaas_customer_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asaas_customer_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      asaas_payments: {
        Row: {
          asaas_customer_id: string
          asaas_payment_id: string
          bank_slip_url: string | null
          billing_type: string
          created_at: string | null
          due_date: string | null
          id: string
          invoice_url: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          asaas_customer_id: string
          asaas_payment_id: string
          bank_slip_url?: string | null
          billing_type: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          asaas_customer_id?: string
          asaas_payment_id?: string
          bank_slip_url?: string | null
          billing_type?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      associacoes_marcas: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          documentos_obrigatorios: string[]
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          produtos_ids: string[]
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
          documentos_obrigatorios?: string[]
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          produtos_ids?: string[]
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
          documentos_obrigatorios?: string[]
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          produtos_ids?: string[]
          regiao?: string | null
          status?: Database["public"]["Enums"]["status_generico"]
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_fornecedor"]
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_secoes: {
        Row: {
          created_at: string
          id: string
          imagem_url: string | null
          ordem: number
          post_id: string
          texto: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imagem_url?: string | null
          ordem?: number
          post_id: string
          texto?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imagem_url?: string | null
          ordem?: number
          post_id?: string
          texto?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_secoes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          autor_id: string | null
          capa_url: string | null
          conteudo: string
          created_at: string
          data_publicacao: string | null
          id: string
          resumo: string | null
          slug: string
          status: string
          subtitulo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          autor_id?: string | null
          capa_url?: string | null
          conteudo: string
          created_at?: string
          data_publicacao?: string | null
          id?: string
          resumo?: string | null
          slug: string
          status?: string
          subtitulo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          capa_url?: string | null
          conteudo?: string
          created_at?: string
          data_publicacao?: string | null
          id?: string
          resumo?: string | null
          slug?: string
          status?: string
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens: {
        Row: {
          anexo_duracao_ms: number | null
          anexo_mime: string | null
          anexo_nome: string | null
          anexo_path: string | null
          anexo_tamanho: number | null
          anexo_tipo: string | null
          anexo_url: string | null
          consulta_id: string
          created_at: string | null
          id: string
          lida: boolean | null
          mensagem: string
          remetente_id: string
          remetente_tipo: string
        }
        Insert: {
          anexo_duracao_ms?: number | null
          anexo_mime?: string | null
          anexo_nome?: string | null
          anexo_path?: string | null
          anexo_tamanho?: number | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          consulta_id: string
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          remetente_id: string
          remetente_tipo: string
        }
        Update: {
          anexo_duracao_ms?: number | null
          anexo_mime?: string | null
          anexo_nome?: string | null
          anexo_path?: string | null
          anexo_tamanho?: number | null
          anexo_tipo?: string | null
          anexo_url?: string | null
          consulta_id?: string
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string
          remetente_id?: string
          remetente_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_sistema: {
        Row: {
          feriados: string[]
          frete_internacional: number
          id: number
          melhor_envio_cep_origem: string
          melhor_envio_remetente: Json
          melhor_envio_sandbox: boolean
          percentual_comissao_medico: number
          prazo_entrega_internacional_dias: number
          taxa_pedido: number
          updated_at: string
          updated_by: string | null
          valor_consulta_padrao: number
        }
        Insert: {
          feriados?: string[]
          frete_internacional?: number
          id?: number
          melhor_envio_cep_origem?: string
          melhor_envio_remetente?: Json
          melhor_envio_sandbox?: boolean
          percentual_comissao_medico?: number
          prazo_entrega_internacional_dias?: number
          taxa_pedido?: number
          updated_at?: string
          updated_by?: string | null
          valor_consulta_padrao?: number
        }
        Update: {
          feriados?: string[]
          frete_internacional?: number
          id?: number
          melhor_envio_cep_origem?: string
          melhor_envio_remetente?: Json
          melhor_envio_sandbox?: boolean
          percentual_comissao_medico?: number
          prazo_entrega_internacional_dias?: number
          taxa_pedido?: number
          updated_at?: string
          updated_by?: string | null
          valor_consulta_padrao?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_sistema_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas: {
        Row: {
          avaliacao_medico_comentario: string | null
          avaliacao_medico_nota: number | null
          cancelada_em: string | null
          cancelada_por: string | null
          created_at: string | null
          data_consulta: string
          eh_retorno: boolean | null
          fila_desde: string | null
          id: string
          medico_id: string | null
          motivo_cancelamento: string | null
          notificado_10min_em: string | null
          notificado_lembrete_em: string | null
          notificados_nivel: Json
          paciente_id: string
          queixa_principal: string | null
          receita_id: string | null
          reembolsada_em: string | null
          resumo_atendimento: string | null
          sintomas: string[] | null
          status: Database["public"]["Enums"]["status_consulta"]
          updated_at: string | null
        }
        Insert: {
          avaliacao_medico_comentario?: string | null
          avaliacao_medico_nota?: number | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          created_at?: string | null
          data_consulta: string
          eh_retorno?: boolean | null
          fila_desde?: string | null
          id?: string
          medico_id?: string | null
          motivo_cancelamento?: string | null
          notificado_10min_em?: string | null
          notificado_lembrete_em?: string | null
          notificados_nivel?: Json
          paciente_id: string
          queixa_principal?: string | null
          receita_id?: string | null
          reembolsada_em?: string | null
          resumo_atendimento?: string | null
          sintomas?: string[] | null
          status?: Database["public"]["Enums"]["status_consulta"]
          updated_at?: string | null
        }
        Update: {
          avaliacao_medico_comentario?: string | null
          avaliacao_medico_nota?: number | null
          cancelada_em?: string | null
          cancelada_por?: string | null
          created_at?: string | null
          data_consulta?: string
          eh_retorno?: boolean | null
          fila_desde?: string | null
          id?: string
          medico_id?: string | null
          motivo_cancelamento?: string | null
          notificado_10min_em?: string | null
          notificado_lembrete_em?: string | null
          notificados_nivel?: Json
          paciente_id?: string
          queixa_principal?: string | null
          receita_id?: string | null
          reembolsada_em?: string | null
          resumo_atendimento?: string | null
          sintomas?: string[] | null
          status?: Database["public"]["Enums"]["status_consulta"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
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
          pedido_id: string | null
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
          pedido_id?: string | null
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
          pedido_id?: string | null
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
          {
            foreignKeyName: "documentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      docusign_envelopes: {
        Row: {
          completed_at: string | null
          created_at: string
          envelope_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          envelope_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          envelope_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
      feedbacks_consultas: {
        Row: {
          comentario: string | null
          created_at: string
          data_consulta: string | null
          id: string
          medico_id: string | null
          nota: number
          paciente_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          data_consulta?: string | null
          id?: string
          medico_id?: string | null
          nota: number
          paciente_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          data_consulta?: string | null
          id?: string
          medico_id?: string | null
          nota?: number
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
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
      medico_documentos: {
        Row: {
          arquivo_url: string
          created_at: string | null
          id: string
          medico_id: string
          nome_arquivo: string | null
          tipo: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          id?: string
          medico_id: string
          nome_arquivo?: string | null
          tipo: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          id?: string
          medico_id?: string
          nome_arquivo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_documentos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          autoriza_compartilhamento_dados: boolean | null
          cpf: string | null
          created_at: string
          crm: string | null
          data_nascimento: string | null
          disponibilidade_dias: string | null
          disponibilidade_horarios: string | null
          disponibilidade_intervalo: string | null
          disponibilidade_recorrencia: string | null
          email: string
          endereco_completo: string | null
          endereco_profissional: string | null
          especialidade_id: string | null
          etapa_validacao: number | null
          id: string
          modo_ferias: boolean
          motivo_recusa: string | null
          nome: string
          observacoes_admin: string | null
          observacoes_prescritor_cannabis: string | null
          queixas_atendidas: string[] | null
          rg: string | null
          sexo: string | null
          status: Database["public"]["Enums"]["status_medico"]
          status_validacao: string | null
          telefone: string | null
          tempo_atuacao: string | null
          tempo_atuacao_anos: number | null
          total_atendimentos: number
          total_ausencias: number
          total_receitas: number
          uf_crm: string | null
          ultimo_acesso: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          autoriza_compartilhamento_dados?: boolean | null
          cpf?: string | null
          created_at?: string
          crm?: string | null
          data_nascimento?: string | null
          disponibilidade_dias?: string | null
          disponibilidade_horarios?: string | null
          disponibilidade_intervalo?: string | null
          disponibilidade_recorrencia?: string | null
          email: string
          endereco_completo?: string | null
          endereco_profissional?: string | null
          especialidade_id?: string | null
          etapa_validacao?: number | null
          id?: string
          modo_ferias?: boolean
          motivo_recusa?: string | null
          nome: string
          observacoes_admin?: string | null
          observacoes_prescritor_cannabis?: string | null
          queixas_atendidas?: string[] | null
          rg?: string | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["status_medico"]
          status_validacao?: string | null
          telefone?: string | null
          tempo_atuacao?: string | null
          tempo_atuacao_anos?: number | null
          total_atendimentos?: number
          total_ausencias?: number
          total_receitas?: number
          uf_crm?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          autoriza_compartilhamento_dados?: boolean | null
          cpf?: string | null
          created_at?: string
          crm?: string | null
          data_nascimento?: string | null
          disponibilidade_dias?: string | null
          disponibilidade_horarios?: string | null
          disponibilidade_intervalo?: string | null
          disponibilidade_recorrencia?: string | null
          email?: string
          endereco_completo?: string | null
          endereco_profissional?: string | null
          especialidade_id?: string | null
          etapa_validacao?: number | null
          id?: string
          modo_ferias?: boolean
          motivo_recusa?: string | null
          nome?: string
          observacoes_admin?: string | null
          observacoes_prescritor_cannabis?: string | null
          queixas_atendidas?: string[] | null
          rg?: string | null
          sexo?: string | null
          status?: Database["public"]["Enums"]["status_medico"]
          status_validacao?: string | null
          telefone?: string | null
          tempo_atuacao?: string | null
          tempo_atuacao_anos?: number | null
          total_atendimentos?: number
          total_ausencias?: number
          total_receitas?: number
          uf_crm?: string | null
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
          rota: string | null
          rota_params: Json | null
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
          rota?: string | null
          rota_params?: Json | null
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
          rota?: string | null
          rota_params?: Json | null
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
      paciente_anamnese: {
        Row: {
          alergias_detalhes: string | null
          altura: number | null
          comorbidades_detalhes: string | null
          exames_recentes_detalhes: string | null
          id: string
          medicacoes_atuais_detalhes: string | null
          paciente_id: string
          peso: number | null
          preferencia_produto_nacional: boolean | null
          produtos_cannabis_utilizados: string | null
          reacoes_adversas_detalhes: string | null
          tem_alergias: boolean | null
          tem_comorbidades: boolean | null
          tem_exames_recentes: boolean | null
          tem_medicacoes_atuais: boolean | null
          tem_reacoes_adversas: boolean | null
          tem_tratamentos_anteriores: boolean | null
          tratamentos_anteriores_detalhes: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alergias_detalhes?: string | null
          altura?: number | null
          comorbidades_detalhes?: string | null
          exames_recentes_detalhes?: string | null
          id?: string
          medicacoes_atuais_detalhes?: string | null
          paciente_id: string
          peso?: number | null
          preferencia_produto_nacional?: boolean | null
          produtos_cannabis_utilizados?: string | null
          reacoes_adversas_detalhes?: string | null
          tem_alergias?: boolean | null
          tem_comorbidades?: boolean | null
          tem_exames_recentes?: boolean | null
          tem_medicacoes_atuais?: boolean | null
          tem_reacoes_adversas?: boolean | null
          tem_tratamentos_anteriores?: boolean | null
          tratamentos_anteriores_detalhes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alergias_detalhes?: string | null
          altura?: number | null
          comorbidades_detalhes?: string | null
          exames_recentes_detalhes?: string | null
          id?: string
          medicacoes_atuais_detalhes?: string | null
          paciente_id?: string
          peso?: number | null
          preferencia_produto_nacional?: boolean | null
          produtos_cannabis_utilizados?: string | null
          reacoes_adversas_detalhes?: string | null
          tem_alergias?: boolean | null
          tem_comorbidades?: boolean | null
          tem_exames_recentes?: boolean | null
          tem_medicacoes_atuais?: boolean | null
          tem_reacoes_adversas?: boolean | null
          tem_tratamentos_anteriores?: boolean | null
          tratamentos_anteriores_detalhes?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paciente_anamnese_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: true
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paciente_anamnese_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          anvisa_expedicao_data: string | null
          anvisa_inscricao_data: string | null
          anvisa_numero_registro: string | null
          anvisa_validade_data: string | null
          bairro: string | null
          cartao_sus: string | null
          cep: string | null
          cidade: string | null
          cpf: string
          created_at: string
          data_nascimento: string
          endereco_complemento: string | null
          endereco_completo: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          estado: string | null
          genero: string | null
          id: string
          nacionalidade: string | null
          nome_mae: string | null
          observacoes_admin: string | null
          rg: string | null
          sexo: string | null
          total_consultas: number
          total_pedidos: number
          total_receitas: number
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anvisa_expedicao_data?: string | null
          anvisa_inscricao_data?: string | null
          anvisa_numero_registro?: string | null
          anvisa_validade_data?: string | null
          bairro?: string | null
          cartao_sus?: string | null
          cep?: string | null
          cidade?: string | null
          cpf: string
          created_at?: string
          data_nascimento: string
          endereco_complemento?: string | null
          endereco_completo?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          estado?: string | null
          genero?: string | null
          id?: string
          nacionalidade?: string | null
          nome_mae?: string | null
          observacoes_admin?: string | null
          rg?: string | null
          sexo?: string | null
          total_consultas?: number
          total_pedidos?: number
          total_receitas?: number
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anvisa_expedicao_data?: string | null
          anvisa_inscricao_data?: string | null
          anvisa_numero_registro?: string | null
          anvisa_validade_data?: string | null
          bairro?: string | null
          cartao_sus?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string
          endereco_complemento?: string | null
          endereco_completo?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          estado?: string | null
          genero?: string | null
          id?: string
          nacionalidade?: string | null
          nome_mae?: string | null
          observacoes_admin?: string | null
          rg?: string | null
          sexo?: string | null
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
            isOneToOne: true
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
          codigo_rastreio: string | null
          created_at: string
          data_pedido: string
          forma_pagamento: string | null
          frete_valor: number | null
          id: string
          melhor_envio_etiqueta_url: string | null
          melhor_envio_order_id: string | null
          melhor_envio_servico_id: number | null
          numero_pedido: string
          paciente_id: string
          prazo_entrega_dias: number | null
          prazo_entrega_fim: string | null
          prazo_entrega_inicio: string | null
          rastreio_atualizado_em: string | null
          receita_id: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          status_anvisa: string
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          associacao_marca_id?: string | null
          canal_aquisicao?: Database["public"]["Enums"]["canal_aquisicao"]
          codigo_rastreio?: string | null
          created_at?: string
          data_pedido?: string
          forma_pagamento?: string | null
          frete_valor?: number | null
          id?: string
          melhor_envio_etiqueta_url?: string | null
          melhor_envio_order_id?: string | null
          melhor_envio_servico_id?: number | null
          numero_pedido: string
          paciente_id: string
          prazo_entrega_dias?: number | null
          prazo_entrega_fim?: string | null
          prazo_entrega_inicio?: string | null
          rastreio_atualizado_em?: string | null
          receita_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_anvisa?: string
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          associacao_marca_id?: string | null
          canal_aquisicao?: Database["public"]["Enums"]["canal_aquisicao"]
          codigo_rastreio?: string | null
          created_at?: string
          data_pedido?: string
          forma_pagamento?: string | null
          frete_valor?: number | null
          id?: string
          melhor_envio_etiqueta_url?: string | null
          melhor_envio_order_id?: string | null
          melhor_envio_servico_id?: number | null
          numero_pedido?: string
          paciente_id?: string
          prazo_entrega_dias?: number | null
          prazo_entrega_fim?: string | null
          prazo_entrega_inicio?: string | null
          rastreio_atualizado_em?: string | null
          receita_id?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_anvisa?: string
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
          ia_preenchimento_anamnese: boolean | null
          ia_preenchimento_evolucao_clinica: boolean | null
          id: string
          notif_email: boolean
          notif_push: boolean
          notif_sms: boolean
          tipos_anvisa: boolean
          tipos_consultas: boolean
          tipos_entregas: boolean
          tipos_novas_receitas: boolean
          tipos_vencimento_receitas: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ia_preenchimento_anamnese?: boolean | null
          ia_preenchimento_evolucao_clinica?: boolean | null
          id?: string
          notif_email?: boolean
          notif_push?: boolean
          notif_sms?: boolean
          tipos_anvisa?: boolean
          tipos_consultas?: boolean
          tipos_entregas?: boolean
          tipos_novas_receitas?: boolean
          tipos_vencimento_receitas?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ia_preenchimento_anamnese?: boolean | null
          ia_preenchimento_evolucao_clinica?: boolean | null
          id?: string
          notif_email?: boolean
          notif_push?: boolean
          notif_sms?: boolean
          tipos_anvisa?: boolean
          tipos_consultas?: boolean
          tipos_entregas?: boolean
          tipos_novas_receitas?: boolean
          tipos_vencimento_receitas?: boolean
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
          altura_cm: number
          associacao_marca_id: string | null
          comprimento_cm: number
          concentracao_cbd: string | null
          concentracao_thc: string | null
          created_at: string
          documento_coa_url: string | null
          fabricante: string | null
          forma_farmaceutica: Database["public"]["Enums"]["forma_farmaceutica"]
          id: string
          imagem_url: string | null
          largura_cm: number
          nome_comercial: string
          orientacao_documento_url: string | null
          peso_g: number
          preco: number | null
          preco_brl: number | null
          preco_usd: number | null
          principio_ativo: string
          status: Database["public"]["Enums"]["status_generico"]
          tipo_origem: string
          updated_at: string
          volume_quantidade: string | null
        }
        Insert: {
          altura_cm?: number
          associacao_marca_id?: string | null
          comprimento_cm?: number
          concentracao_cbd?: string | null
          concentracao_thc?: string | null
          created_at?: string
          documento_coa_url?: string | null
          fabricante?: string | null
          forma_farmaceutica: Database["public"]["Enums"]["forma_farmaceutica"]
          id?: string
          imagem_url?: string | null
          largura_cm?: number
          nome_comercial: string
          orientacao_documento_url?: string | null
          peso_g?: number
          preco?: number | null
          preco_brl?: number | null
          preco_usd?: number | null
          principio_ativo: string
          status?: Database["public"]["Enums"]["status_generico"]
          tipo_origem?: string
          updated_at?: string
          volume_quantidade?: string | null
        }
        Update: {
          altura_cm?: number
          associacao_marca_id?: string | null
          comprimento_cm?: number
          concentracao_cbd?: string | null
          concentracao_thc?: string | null
          created_at?: string
          documento_coa_url?: string | null
          fabricante?: string | null
          forma_farmaceutica?: Database["public"]["Enums"]["forma_farmaceutica"]
          id?: string
          imagem_url?: string | null
          largura_cm?: number
          nome_comercial?: string
          orientacao_documento_url?: string | null
          peso_g?: number
          preco?: number | null
          preco_brl?: number | null
          preco_usd?: number | null
          principio_ativo?: string
          status?: Database["public"]["Enums"]["status_generico"]
          tipo_origem?: string
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
          asaas_customer_id: string | null
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
          asaas_customer_id?: string | null
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
          asaas_customer_id?: string | null
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
      prontuarios: {
        Row: {
          arquivo_url: string | null
          consulta_id: string | null
          conteudo: Json | null
          created_at: string
          id: string
          medico_id: string | null
          paciente_id: string
          status: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          consulta_id?: string | null
          conteudo?: Json | null
          created_at?: string
          id?: string
          medico_id?: string | null
          paciente_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          consulta_id?: string | null
          conteudo?: Json | null
          created_at?: string
          id?: string
          medico_id?: string | null
          paciente_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prontuarios_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prontuarios_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          plataforma: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plataforma: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plataforma?: string
          token?: string
          updated_at?: string
          user_id?: string
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
          notificado_vencimento_em: string | null
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
          notificado_vencimento_em?: string | null
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
          notificado_vencimento_em?: string | null
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
      repasses_medicos: {
        Row: {
          created_at: string
          data_repasse: string
          id: string
          medico_id: string
          observacao: string | null
          pedido_id: string | null
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_repasse?: string
          id?: string
          medico_id: string
          observacao?: string | null
          pedido_id?: string | null
          status?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_repasse?: string
          id?: string
          medico_id?: string
          observacao?: string | null
          pedido_id?: string | null
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "repasses_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repasses_medicos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
      admin_aprovar_medico: { Args: { p_id: string }; Returns: undefined }
      admin_aprovar_pedido: {
        Args: { p_id: string; p_observacao?: string }
        Returns: undefined
      }
      admin_ativar_medico: { Args: { p_id: string }; Returns: undefined }
      admin_ativar_paciente: { Args: { p_id: string }; Returns: undefined }
      admin_create_associacao: {
        Args: {
          p_cidade?: string
          p_cnpj?: string
          p_documentos_obrigatorios?: string[]
          p_email?: string
          p_endereco?: string
          p_estado?: string
          p_nome: string
          p_observacoes?: string
          p_produtos_ids?: string[]
          p_regiao?: string
          p_telefone?: string
          p_tipo: string
        }
        Returns: string
      }
      admin_delete_blog_post: { Args: { p_id: string }; Returns: undefined }
      admin_delete_blog_post_secao: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_medico_documento: {
        Args: { p_id: string }
        Returns: undefined
      }
      admin_delete_paciente_documento: {
        Args: { p_id: string }
        Returns: undefined
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
          documentos_obrigatorios: string[]
          email: string
          endereco: string
          estado: string
          id: string
          nome: string
          observacoes: string
          produtos_ids: string[]
          regiao: string
          status: string
          telefone: string
          tipo: string
          updated_at: string
        }[]
      }
      admin_get_blog_post: {
        Args: { p_id: string }
        Returns: {
          autor_nome: string
          capa_url: string
          conteudo: string
          created_at: string
          data_publicacao: string
          id: string
          resumo: string
          slug: string
          status: string
          subtitulo: string
          titulo: string
        }[]
      }
      admin_get_configuracoes_sistema: {
        Args: never
        Returns: {
          feriados: string[]
          frete_internacional: number
          melhor_envio_cep_origem: string
          melhor_envio_remetente: Json
          melhor_envio_sandbox: boolean
          percentual_comissao_medico: number
          prazo_entrega_internacional_dias: number
          taxa_pedido: number
          updated_at: string
          valor_consulta_padrao: number
        }[]
      }
      admin_get_dashboard_stats: {
        Args: { p_data_fim?: string; p_data_ini?: string }
        Returns: {
          aprovacoes_anvisa: number
          associacoes_ativas: number
          consultas_finalizadas: number
          faturamento_consultas: number
          faturamento_pedidos: number
          faturamento_total: number
          medicos_ativos: number
          pacientes_ativos: number
          pedidos_realizados: number
          produtos_catalogo: number
          receitas_emitidas: number
        }[]
      }
      admin_get_feedbacks_resumo: {
        Args: { p_data_fim?: string; p_data_ini?: string }
        Returns: {
          media_geral: number
          notas_baixas: number
          total: number
        }[]
      }
      admin_get_medico: {
        Args: { p_id: string }
        Returns: {
          cpf: string
          created_at: string
          crm: string
          email: string
          endereco_profissional: string
          especialidade_nome: string
          foto_perfil_url: string
          id: string
          nome: string
          observacoes_admin: string
          status: string
          telefone: string
          tempo_atuacao_anos: number
          total_atendimentos: number
          total_ausencias: number
          total_receitas: number
          uf_crm: string
          ultimo_acesso: string
          user_id: string
        }[]
      }
      admin_get_medico_atendimentos: {
        Args: { p_limit?: number; p_medico_id: string }
        Returns: {
          cancelada_por: string
          data_consulta: string
          id: string
          motivo_cancelamento: string
          paciente_nome: string
          queixa_principal: string
          receita_id: string
          status: string
        }[]
      }
      admin_get_medico_documentos: {
        Args: { p_medico_id: string }
        Returns: {
          arquivo_url: string
          created_at: string
          id: string
          nome_arquivo: string
          tipo: string
        }[]
      }
      admin_get_medico_receitas: {
        Args: { p_limit?: number; p_medico_id: string }
        Returns: {
          data_emissao: string
          documento_url: string
          id: string
          numero_receita: string
          paciente_nome: string
          status: string
          validade: string
        }[]
      }
      admin_get_medico_repasses: {
        Args: { p_medico_id: string }
        Returns: {
          data_repasse: string
          id: string
          observacao: string
          status: string
          valor: number
        }[]
      }
      admin_get_monthly_faturamento: {
        Args: { p_year: number }
        Returns: {
          month: number
          month_name: string
          valor: number
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
          bairro: string
          cep: string
          cidade: string
          cpf: string
          created_at: string
          data_nascimento: string
          email: string
          endereco_complemento: string
          endereco_completo: string
          endereco_logradouro: string
          endereco_numero: string
          estado: string
          foto_perfil_url: string
          genero: string
          id: string
          nome_completo: string
          observacoes_admin: string
          rg: string
          sexo: string
          telefone: string
          total_consultas: number
          total_pedidos: number
          total_receitas: number
          ultimo_acesso: string
          user_id: string
        }[]
      }
      admin_get_paciente_anamnese: {
        Args: { p_paciente_id: string }
        Returns: {
          alergias_detalhes: string
          altura: number
          comorbidades_detalhes: string
          exames_recentes_detalhes: string
          medicacoes_atuais_detalhes: string
          peso: number
          produtos_cannabis_utilizados: string
          reacoes_adversas_detalhes: string
          tem_alergias: boolean
          tem_comorbidades: boolean
          tem_exames_recentes: boolean
          tem_medicacoes_atuais: boolean
          tem_reacoes_adversas: boolean
          tem_tratamentos_anteriores: boolean
          tratamentos_anteriores_detalhes: string
          updated_at: string
        }[]
      }
      admin_get_paciente_consultas: {
        Args: { p_limit?: number; p_paciente_id: string }
        Returns: {
          data_consulta: string
          id: string
          medico_nome: string
          queixa_principal: string
          receita_id: string
          status: string
        }[]
      }
      admin_get_paciente_documentos: {
        Args: { p_paciente_id: string }
        Returns: {
          arquivo_url: string
          categoria: string
          created_at: string
          id: string
          nome_arquivo: string
          tipo: string
        }[]
      }
      admin_get_paciente_pagamentos: {
        Args: { p_paciente_id: string }
        Returns: {
          data_pagamento: string
          referencia: string
          tipo: string
          valor: number
        }[]
      }
      admin_get_paciente_pedidos: {
        Args: { p_limit?: number; p_paciente_id: string }
        Returns: {
          canal_aquisicao: string
          data_pedido: string
          id: string
          numero_pedido: string
          status: string
          status_anvisa: string
          valor_total: number
        }[]
      }
      admin_get_paciente_prontuarios: {
        Args: { p_limit?: number; p_paciente_id: string }
        Returns: {
          arquivo_url: string
          consulta_id: string
          created_at: string
          id: string
          medico_nome: string
          status: string
        }[]
      }
      admin_get_paciente_receitas: {
        Args: { p_limit?: number; p_paciente_id: string }
        Returns: {
          data_emissao: string
          documento_url: string
          id: string
          medico_nome: string
          numero_receita: string
          status: string
          validade: string
        }[]
      }
      admin_get_pedido_detalhes: {
        Args: { p_id: string }
        Returns: {
          canal_aquisicao: string
          codigo_rastreio: string
          data_emissao: string
          data_pedido: string
          documentos: Json
          historico: Json
          id: string
          medico_nome: string
          numero_pedido: string
          numero_receita: string
          paciente_id: string
          paciente_nome: string
          prazo_entrega_fim: string
          prazo_entrega_inicio: string
          rastreio_atualizado_em: string
          receita_id: string
          status: string
          status_anvisa: string
          valor_total: number
        }[]
      }
      admin_get_pedido_produtos: {
        Args: { p_pedido_id: string }
        Returns: {
          concentracao_cbd: string
          concentracao_thc: string
          forma_farmaceutica: string
          fornecedor_nome: string
          fornecedor_tipo: string
          imagem_url: string
          item_id: string
          posologia: string
          produto_id: string
          produto_nome: string
          quantidade: number
          tipo_origem: string
        }[]
      }
      admin_get_receita_detalhes: {
        Args: { p_id: string }
        Returns: {
          data_emissao: string
          documento_url: string
          id: string
          medico_crm: string
          medico_nome: string
          numero_receita: string
          observacoes: string
          paciente_id: string
          paciente_nome: string
          status: string
          validade: string
        }[]
      }
      admin_get_receita_itens: {
        Args: { p_receita_id: string }
        Returns: {
          concentracao_cbd: string
          concentracao_thc: string
          duracao_tratamento: string
          forma_farmaceutica: string
          imagem_url: string
          item_id: string
          posologia: string
          produto_id: string
          produto_nome: string
          quantidade_prescrita: number
        }[]
      }
      admin_get_recent_anvisa: {
        Args: { p_limit?: number }
        Returns: {
          data_pedido: string
          id: string
          numero_pedido: string
          paciente_nome: string
          status_anvisa: string
        }[]
      }
      admin_get_recent_medicos: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          crm: string
          email: string
          foto_perfil_url: string
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
      admin_list_blog_post_secoes: {
        Args: { p_post_id: string }
        Returns: {
          id: string
          imagem_url: string
          ordem: number
          texto: string
          titulo: string
        }[]
      }
      admin_list_blog_posts: {
        Args: never
        Returns: {
          autor_nome: string
          capa_url: string
          created_at: string
          data_publicacao: string
          id: string
          resumo: string
          slug: string
          status: string
          titulo: string
        }[]
      }
      admin_list_feedbacks: {
        Args: { p_nota_min?: number }
        Returns: {
          comentario: string
          created_at: string
          data_consulta: string
          id: string
          medico_id: string
          medico_nome: string
          nota: number
          paciente_id: string
          paciente_nome: string
        }[]
      }
      admin_list_medicos: {
        Args: never
        Returns: {
          cpf: string
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
      admin_list_medicos_solicitacoes: {
        Args: never
        Returns: {
          cpf: string
          created_at: string
          crm: string
          email: string
          especialidade_nome: string
          etapa_validacao: number
          foto_perfil_url: string
          id: string
          nome: string
          status_validacao: string
          telefone: string
          total_atendimentos: number
          uf_crm: string
          ultimo_acesso: string
        }[]
      }
      admin_list_paciente_consultas: {
        Args: {
          p_data_fim?: string
          p_data_ini?: string
          p_limit?: number
          p_offset?: number
          p_paciente_id: string
          p_search?: string
          p_status?: string[]
        }
        Returns: {
          avaliacao_medico_comentario: string
          avaliacao_medico_nota: number
          cancelada_em: string
          cancelada_por: string
          data_consulta: string
          eh_retorno: boolean
          feedback_comentario: string
          feedback_nota: number
          id: string
          medico_crm: string
          medico_id: string
          medico_nome: string
          medico_uf_crm: string
          motivo_cancelamento: string
          numero_receita: string
          queixa_principal: string
          receita_id: string
          reembolsada_em: string
          resumo_atendimento: string
          sintomas: string[]
          status: string
          total_count: number
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
      admin_list_pedidos: {
        Args: {
          p_data_fim?: string
          p_data_ini?: string
          p_limit?: number
          p_medico?: string
          p_offset?: number
          p_paciente?: string
          p_search?: string
          p_status?: string[]
        }
        Returns: {
          data_pedido: string
          id: string
          numero_pedido: string
          paciente_nome: string
          prescritor_nome: string
          status: string
          total_count: number
          valor_total: number
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
      admin_recusar_medico: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      admin_recusar_pedido: {
        Args: { p_id: string; p_motivo: string }
        Returns: undefined
      }
      admin_register_medico_ausencia: {
        Args: { p_consulta_id?: string; p_medico_id: string; p_motivo?: string }
        Returns: undefined
      }
      admin_registrar_anvisa: {
        Args: {
          p_aprovado: boolean
          p_arquivo_url?: string
          p_id: string
          p_nome_arquivo?: string
        }
        Returns: undefined
      }
      admin_reset_medico_ausencias: {
        Args: { p_medico_id?: string }
        Returns: number
      }
      admin_update_associacao: {
        Args: {
          p_cidade?: string
          p_cnpj?: string
          p_documentos_obrigatorios?: string[]
          p_email?: string
          p_endereco?: string
          p_estado?: string
          p_id: string
          p_nome: string
          p_observacoes?: string
          p_produtos_ids?: string[]
          p_regiao?: string
          p_telefone?: string
          p_tipo?: string
        }
        Returns: undefined
      }
      admin_update_configuracoes_sistema: {
        Args: {
          p_feriados: string[]
          p_frete_intl: number
          p_me_cep_origem?: string
          p_me_remetente?: Json
          p_me_sandbox?: boolean
          p_percentual_comissao: number
          p_prazo_intl: number
          p_taxa_pedido: number
          p_valor_consulta: number
        }
        Returns: undefined
      }
      admin_update_medico: {
        Args: {
          p_cpf?: string
          p_crm: string
          p_email: string
          p_id: string
          p_telefone: string
          p_uf_crm: string
        }
        Returns: undefined
      }
      admin_update_medico_observacoes: {
        Args: { p_id: string; p_observacoes: string }
        Returns: undefined
      }
      admin_update_paciente: {
        Args: {
          p_bairro?: string
          p_cep?: string
          p_cidade?: string
          p_cpf?: string
          p_data_nascimento?: string
          p_endereco_complemento?: string
          p_endereco_completo?: string
          p_endereco_logradouro?: string
          p_endereco_numero?: string
          p_estado?: string
          p_genero?: string
          p_id: string
          p_rg?: string
          p_sexo?: string
          p_telefone?: string
        }
        Returns: undefined
      }
      admin_update_paciente_observacoes: {
        Args: { p_id: string; p_observacoes: string }
        Returns: undefined
      }
      admin_update_pedido_anvisa: {
        Args: { p_id: string; p_observacao?: string; p_status_anvisa: string }
        Returns: undefined
      }
      admin_update_pedido_entrega: {
        Args: {
          p_codigo_rastreio?: string
          p_id: string
          p_observacao?: string
          p_prazo_entrega_fim?: string
          p_prazo_entrega_inicio?: string
          p_status?: string
        }
        Returns: undefined
      }
      admin_update_repasse_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      admin_upsert_blog_post: {
        Args: {
          p_capa_url: string
          p_conteudo: string
          p_data_publicacao: string
          p_id: string
          p_resumo: string
          p_slug: string
          p_status: string
          p_subtitulo?: string
          p_titulo: string
        }
        Returns: string
      }
      admin_upsert_blog_post_secao: {
        Args: {
          p_id: string
          p_imagem_url: string
          p_ordem: number
          p_post_id: string
          p_texto: string
          p_titulo: string
        }
        Returns: string
      }
      admin_upsert_medico_documento: {
        Args: {
          p_arquivo_url: string
          p_medico_id: string
          p_nome_arquivo: string
          p_tipo: string
        }
        Returns: string
      }
      admin_upsert_paciente_anamnese: {
        Args: {
          p_alergias_detalhes?: string
          p_altura?: number
          p_comorbidades_detalhes?: string
          p_exames_recentes_detalhes?: string
          p_medicacoes_atuais_detalhes?: string
          p_paciente_id: string
          p_peso?: number
          p_produtos_cannabis_utilizados?: string
          p_reacoes_adversas_detalhes?: string
          p_tem_alergias?: boolean
          p_tem_comorbidades?: boolean
          p_tem_exames_recentes?: boolean
          p_tem_medicacoes_atuais?: boolean
          p_tem_reacoes_adversas?: boolean
          p_tem_tratamentos_anteriores?: boolean
          p_tratamentos_anteriores_detalhes?: string
        }
        Returns: undefined
      }
      admin_upsert_paciente_documento: {
        Args: {
          p_arquivo_url: string
          p_nome_arquivo: string
          p_paciente_id: string
          p_tipo: string
        }
        Returns: string
      }
      assign_admin_role: { Args: { user_email: string }; Returns: undefined }
      ativar_produto: { Args: { p_produto_id: string }; Returns: undefined }
      atribuir_medico_automatico: {
        Args: { p_consulta_id: string }
        Returns: string
      }
      avancar_fila_consulta: {
        Args: { p_consulta_id: string; p_nivel_alvo: number }
        Returns: undefined
      }
      chat_media_consulta_id: { Args: { object_name: string }; Returns: string }
      check_cpf_disponivel: { Args: { p_cpf: string }; Returns: boolean }
      consultas_slots_disponiveis: {
        Args: { p_dias_a_frente?: number }
        Returns: {
          data: string
          horario: string
          medico_id: string
        }[]
      }
      contar_notificacoes_nao_lidas: { Args: never; Returns: number }
      create_produto: {
        Args: {
          p_altura_cm?: number
          p_comprimento_cm?: number
          p_concentracao_cbd: string
          p_concentracao_thc: string
          p_documento_coa_url?: string
          p_fabricante: string
          p_forma_farmaceutica: string
          p_imagem_url: string
          p_largura_cm?: number
          p_nome_comercial: string
          p_orientacao_documento_url?: string
          p_peso_g?: number
          p_principio_ativo: string
          p_status: string
          p_volume_quantidade: string
        }
        Returns: string
      }
      despachar_nivel: {
        Args: { p_consulta_id: string; p_nivel: number }
        Returns: number
      }
      dia_semana_pt: { Args: { p_data: string }; Returns: string }
      enviar_push_async: {
        Args: {
          p_corpo: string
          p_data?: Json
          p_titulo: string
          p_user_id: string
        }
        Returns: undefined
      }
      escalonar_fila_consultas: { Args: never; Returns: undefined }
      expirar_consulta_sem_medico: {
        Args: { p_consulta_id: string }
        Returns: undefined
      }
      gerar_lembretes_10min_consultas: { Args: never; Returns: undefined }
      gerar_notificacoes_agendadas: { Args: never; Returns: undefined }
      gerar_numero_pedido: { Args: never; Returns: string }
      gerar_numero_receita: { Args: never; Returns: string }
      gerar_repasse_pedido: { Args: { p_pedido_id: string }; Returns: string }
      get_medico_publico: {
        Args: { p_medico_id: string }
        Returns: {
          crm: string
          especialidade_nome: string
          foto_perfil_url: string
          id: string
          nome: string
          uf_crm: string
        }[]
      }
      get_melhor_envio_config: {
        Args: { p_associacao_id?: string }
        Returns: {
          cep_origem: string
          remetente: Json
          sandbox: boolean
        }[]
      }
      get_paciente_ids_for_current_user: { Args: never; Returns: string[] }
      get_valor_consulta_padrao: { Args: never; Returns: number }
      has_permission: {
        Args: { _acao?: string; _modulo: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inativar_produto: { Args: { p_produto_id: string }; Returns: undefined }
      is_consulta_participant: {
        Args: { consulta_uuid: string }
        Returns: boolean
      }
      listar_minhas_notificacoes: {
        Args: never
        Returns: {
          categoria: Database["public"]["Enums"]["categoria_notificacao"]
          created_at: string
          data_envio: string
          descricao: string
          destinatario_id: string | null
          destinatario_tipo: Database["public"]["Enums"]["destinatario_tipo"]
          id: string
          lida: boolean
          lida_em: string | null
          rota: string | null
          rota_params: Json | null
          tipo: Database["public"]["Enums"]["tipo_notificacao"]
          tipo_envio: Database["public"]["Enums"]["tipo_envio"]
          titulo: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notificacoes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      medico_assumir_consulta: {
        Args: { p_consulta_id: string }
        Returns: undefined
      }
      medico_atual_id: { Args: never; Returns: string }
      medico_atualizar_status_consulta: {
        Args: { p_consulta_id: string; p_status: string }
        Returns: undefined
      }
      medico_elegivel_agora: {
        Args: { p_consulta_id: string; p_medico_id: string }
        Returns: boolean
      }
      medico_emitir_receita: {
        Args: {
          p_consulta_id?: string
          p_itens: Json
          p_observacoes?: string
          p_paciente_id: string
          p_validade: string
        }
        Returns: {
          id: string
          numero_receita: string
        }[]
      }
      medico_finalizar_atendimento: {
        Args: {
          p_avaliacao_comentario?: string
          p_avaliacao_nota?: number
          p_consulta_id: string
          p_resumo?: string
        }
        Returns: undefined
      }
      medico_listar_atendimentos: {
        Args: { p_incluir_fila?: boolean; p_limit?: number; p_status?: string }
        Returns: {
          data_consulta: string
          eh_retorno: boolean
          id: string
          na_fila: boolean
          paciente_id: string
          paciente_nome: string
          queixa_principal: string
          receita_id: string
          sintomas: string[]
          status: string
        }[]
      }
      medico_listar_repasses: {
        Args: { p_limit?: number }
        Returns: {
          data_repasse: string
          id: string
          observacao: string
          pedido_id: string
          status: string
          valor: number
        }[]
      }
      medico_resumo_financeiro: {
        Args: never
        Returns: {
          total_atendimentos: number
          total_pendente: number
          total_recebido: number
        }[]
      }
      medicos_elegiveis_nivel: {
        Args: { p_consulta_id: string; p_nivel: number }
        Returns: {
          medico_id: string
          medico_user_id: string
        }[]
      }
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
      status_consulta:
        | "agendada"
        | "em_andamento"
        | "finalizada"
        | "cancelada"
        | "expirada"
      status_generico: "ativo" | "inativo" | "rascunho"
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
        | "procuracao"
        | "prontuario"
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
      status_consulta: [
        "agendada",
        "em_andamento",
        "finalizada",
        "cancelada",
        "expirada",
      ],
      status_generico: ["ativo", "inativo", "rascunho"],
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
        "procuracao",
        "prontuario",
      ],
      tipo_envio: ["imediato", "agendado"],
      tipo_fornecedor: ["associacao", "marca"],
      tipo_notificacao: ["sistema", "personalizada"],
      tipo_usuario: ["admin", "medico", "paciente"],
    },
  },
} as const

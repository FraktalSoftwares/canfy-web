import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
});

// Product creation validation schema
export const productSchema = z.object({
  nome_comercial: z.string()
    .min(3, 'Nome comercial deve ter no mínimo 3 caracteres')
    .max(200, 'Nome comercial muito longo')
    .trim(),
  principio_ativo: z.string()
    .min(3, 'Princípio ativo deve ter no mínimo 3 caracteres')
    .max(200, 'Princípio ativo muito longo')
    .trim(),
  forma_farmaceutica: z.string()
    .min(1, 'Forma farmacêutica é obrigatória'),
  concentracao_cbd: z.string()
    .max(50, 'Concentração CBD muito longa')
    .optional(),
  concentracao_thc: z.string()
    .max(50, 'Concentração THC muito longa')
    .optional(),
  fabricante: z.string()
    .max(200, 'Nome do fabricante muito longo')
    .optional(),
  volume_quantidade: z.string()
    .max(100, 'Volume/quantidade muito longo')
    .optional(),
  imagem_url: z.string()
    .url('URL de imagem inválida')
    .optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
  peso_g: z.number()
    .int('Peso deve ser inteiro (em gramas)')
    .positive('Peso deve ser maior que zero')
    .max(30000, 'Peso máximo Melhor Envio é 30kg'),
  largura_cm: z.number()
    .min(11, 'Largura mínima Melhor Envio é 11cm')
    .max(105, 'Largura máxima Melhor Envio é 105cm'),
  altura_cm: z.number()
    .min(2, 'Altura mínima Melhor Envio é 2cm')
    .max(105, 'Altura máxima Melhor Envio é 105cm'),
  comprimento_cm: z.number()
    .min(16, 'Comprimento mínimo Melhor Envio é 16cm')
    .max(105, 'Comprimento máximo Melhor Envio é 105cm'),
});

// User profile update validation schema
export const profileUpdateSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome completo deve ter no mínimo 3 caracteres')
    .max(200, 'Nome completo muito longo')
    .trim(),
  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional(),
});

// Patient update validation schema
export const patientUpdateSchema = z.object({
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido')
    .optional(),
  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional(),
  data_nascimento: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento inválida')
    .optional(),
  endereco_completo: z.string()
    .max(500, 'Endereço muito longo')
    .optional(),
});

// Association/brand validation schema
export const associacaoSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(200, 'Nome muito longo')
    .trim(),
  tipo: z.enum(['associacao', 'marca']),
  cnpj: z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido')
    .optional(),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional(),
  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido')
    .optional(),
  regiao: z.string()
    .max(100, 'Região muito longa')
    .optional(),
  observacoes: z.string()
    .max(1000, 'Observações muito longas')
    .optional(),
});

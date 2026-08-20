/**
 * Máscaras de entrada para os formatos brasileiros usados no painel.
 *
 * As funções são idempotentes: recebem o valor cru do input (já mascarado ou
 * não), descartam tudo que não for dígito e reaplicam a formatação. Isso as
 * torna seguras para uso direto no `onChange` de um <Input> controlado.
 *
 * Os formatos produzidos aqui são exatamente os que os schemas Zod em
 * `validations.ts` esperam (patientUpdateSchema, profileUpdateSchema,
 * associacaoSchema).
 */

/** Remove toda a formatação, devolvendo apenas os dígitos. */
export const unmask = (valor: string): string => (valor || '').replace(/\D/g, '');

/** Comprimentos máximos do valor já mascarado — use em `maxLength` do input. */
export const MASK_MAX_LENGTH = {
  cpf: 14, // 000.000.000-00
  telefone: 15, // (00) 00000-0000
  cnpj: 18, // 00.000.000/0000-00
} as const;

/** `12345678901` → `123.456.789-01` */
export const maskCPF = (valor: string): string => {
  const d = unmask(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/**
 * `11987654321` → `(11) 98765-4321` (celular)
 * `1133334444`  → `(11) 3333-4444`  (fixo)
 */
export const maskTelefone = (valor: string): string => {
  const d = unmask(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  // Até 10 dígitos formata como fixo (4+4); a partir do 11º, como celular (5+4).
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** `12345678000199` → `12.345.678/0001-99` */
export const maskCNPJ = (valor: string): string => {
  const d = unmask(valor).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

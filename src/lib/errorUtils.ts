/**
 * Security utility to map technical errors to user-friendly messages
 * Prevents information leakage through error messages
 */

export const getUserFriendlyError = (error: any): string => {
  // Log full error details server-side (console) for debugging
  console.error('[Internal Error]', error);

  // Return generic messages to users to prevent information leakage
  if (error?.message) {
    const msg = error.message.toLowerCase();

    // Authentication errors
    if (msg.includes('invalid login credentials')) {
      return 'Email ou senha incorretos.';
    }
    if (msg.includes('not authorized') || msg.includes('unauthorized')) {
      return 'Você não tem permissão para realizar esta ação.';
    }
    if (msg.includes('user already registered') || msg.includes('already registered')) {
      return 'Este email já está cadastrado.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Por favor, confirme seu email antes de fazer login.';
    }

    // Database/constraint errors - don't expose details
    if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
      return 'Este registro já existe no sistema.';
    }
    if (msg.includes('foreign key') || msg.includes('violates')) {
      return 'Não foi possível completar a operação devido a dependências.';
    }

    // Storage errors
    if (msg.includes('storage') || msg.includes('upload')) {
      return 'Erro ao fazer upload do arquivo. Tente novamente.';
    }

    // Network errors
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
  }

  // Default generic message for any other error
  return 'Não foi possível completar a operação. Tente novamente.';
};

/**
 * supabase.functions.invoke() transforma qualquer resposta não-2xx em
 * FunctionsHttpError com a mensagem fixa em inglês "Edge Function returned
 * a non-2xx status code" e `data: null` — o corpo JSON que a função
 * devolveu (ex.: { error: 'e-mail já cadastrado' }) só é acessível via
 * error.context. Esta função lê esse corpo para recuperar a mensagem real.
 */
export const getEdgeFunctionErrorMessage = async (error: any): Promise<string | null> => {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error as string;
    } catch {
      // corpo não é JSON ou já foi consumido — segue para o fallback
    }
  }
  return null;
};

/**
 * Format validation errors from Zod or similar libraries
 */
export const getValidationError = (error: any): string => {
  console.error('[Validation Error]', error);
  
  if (error?.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors[0]?.message || 'Dados inválidos fornecidos.';
  }
  
  return 'Dados inválidos fornecidos.';
};

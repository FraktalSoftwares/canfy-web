-- tipo_documento: adicionar 'procuracao' e 'prontuario' (aditivo módulo 18.1)
-- ALTER TYPE ADD VALUE não pode estar na mesma transação onde o enum é
-- referenciado, então fica em migration própria.
ALTER TYPE public.tipo_documento ADD VALUE IF NOT EXISTS 'procuracao';
ALTER TYPE public.tipo_documento ADD VALUE IF NOT EXISTS 'prontuario';

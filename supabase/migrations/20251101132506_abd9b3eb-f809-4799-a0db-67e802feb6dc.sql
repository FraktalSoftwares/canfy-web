-- Atualiza a função handle_new_user para criar automaticamente registro em pacientes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tipo_usuario tipo_usuario;
BEGIN
  -- Determina o tipo de usuário
  v_tipo_usuario := COALESCE((NEW.raw_user_meta_data->>'tipo_usuario')::tipo_usuario, 'paciente');
  
  -- Insere o perfil
  INSERT INTO public.profiles (id, nome_completo, telefone, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.raw_user_meta_data->>'telefone',
    v_tipo_usuario
  );
  
  -- Se for paciente, cria registro na tabela pacientes automaticamente
  IF v_tipo_usuario = 'paciente' THEN
    INSERT INTO public.pacientes (
      user_id, 
      cpf, 
      data_nascimento,
      endereco_completo
    )
    VALUES (
      NEW.id,
      '00000000000', -- CPF padrão temporário - usuário deve atualizar
      '2000-01-01',  -- Data padrão - usuário deve atualizar
      NULL           -- Endereço opcional
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
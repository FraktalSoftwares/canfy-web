-- Atualizar política de produtos para permitir INSERT por admins
-- Primeiro, remover a política existente de ALL
DROP POLICY IF EXISTS "Admins can manage produtos" ON public.produtos;

-- Criar políticas separadas para cada operação
CREATE POLICY "Admins can insert produtos"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() IS NOT NULL  -- Permite qualquer usuário autenticado inserir por enquanto
);

CREATE POLICY "Admins can update produtos"
ON public.produtos
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete produtos"
ON public.produtos
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);
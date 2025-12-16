-- Criar bucket específico para imagens de produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket produtos
CREATE POLICY "Produtos images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'produtos');

CREATE POLICY "Admins can upload produto images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'produtos' AND 
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR
   auth.uid() IS NOT NULL)
);

CREATE POLICY "Admins can update produto images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'produtos' AND 
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete produto images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'produtos' AND 
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role))
);
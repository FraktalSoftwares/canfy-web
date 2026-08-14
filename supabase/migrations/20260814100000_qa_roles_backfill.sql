-- QA: usuários com profiles.tipo_usuario = 'admin' criados pelo painel antes desta
-- correção nunca receberam linha em user_roles, então ficavam sem acesso efetivo
-- (e sujeitos ao bug de serem tratados como paciente). Backfill como 'admin'.
insert into public.user_roles (user_id, role)
select p.id, 'admin'::app_role
from public.profiles p
where p.tipo_usuario = 'admin'
  and p.ativo
  and not exists (select 1 from public.user_roles r where r.user_id = p.id);

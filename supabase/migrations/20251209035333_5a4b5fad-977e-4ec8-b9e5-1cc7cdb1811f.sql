-- Atualiza a função handle_new_user para tornar o primeiro usuário admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count INTEGER;
  new_role app_role;
BEGIN
  -- Conta quantos usuários já existem
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- Se não houver nenhum usuário, o primeiro será admin
  IF user_count = 0 THEN
    new_role := 'admin';
  ELSE
    new_role := 'colaborador';
  END IF;
  
  -- Insere o perfil
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Adiciona a role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role);
  
  RETURN NEW;
END;
$$;
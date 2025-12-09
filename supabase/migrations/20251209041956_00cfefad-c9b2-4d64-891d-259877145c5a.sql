-- Cria trigger para vincular automaticamente o criador da empresa como admin
CREATE OR REPLACE FUNCTION public.handle_new_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vincula o criador da empresa como admin
  INSERT INTO public.user_companies (user_id, company_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Remove trigger se existir e recria
DROP TRIGGER IF EXISTS on_company_created ON public.companies;

CREATE TRIGGER on_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company();
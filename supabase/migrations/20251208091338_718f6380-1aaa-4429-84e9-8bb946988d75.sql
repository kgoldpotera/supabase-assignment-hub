
-- 1. Create security definer function to check roles (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Drop problematic RLS policies on user_roles that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- 3. Recreate policies using the security definer function
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Make unit_id required on assignments (all assignments must belong to a unit)
ALTER TABLE public.assignments 
ALTER COLUMN unit_id SET NOT NULL;

-- 5. Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'assignments_unit_id_fkey' 
    AND table_name = 'assignments'
  ) THEN
    ALTER TABLE public.assignments 
    ADD CONSTRAINT assignments_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;
  END IF;
END $$;

-- First drop ALL policies that depend on has_role function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Teachers can create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can update their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Teachers can delete their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can create units" ON public.units;
DROP POLICY IF EXISTS "Teachers can update their own units" ON public.units;
DROP POLICY IF EXISTS "Teachers can delete their own units" ON public.units;
DROP POLICY IF EXISTS "Students can register for units" ON public.unit_registrations;
DROP POLICY IF EXISTS "Teachers and admins can view all assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view assignments for registered units" ON public.assignments;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Recreate policies using direct subqueries
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY "Students can view assignments for registered units" ON public.assignments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'student')
  AND (unit_id IS NULL OR EXISTS (SELECT 1 FROM unit_registrations reg WHERE reg.unit_id = assignments.unit_id AND reg.student_id = auth.uid()))
);

CREATE POLICY "Teachers and admins can view all assignments" ON public.assignments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);

CREATE POLICY "Teachers can create assignments" ON public.assignments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);

CREATE POLICY "Teachers can update their own assignments" ON public.assignments
FOR UPDATE USING (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);

CREATE POLICY "Teachers can delete their own assignments" ON public.assignments
FOR DELETE USING (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);

CREATE POLICY "Students can create submissions" ON public.submissions
FOR INSERT WITH CHECK (
  auth.uid() = student_id AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'student')
);

CREATE POLICY "Students can register for units" ON public.unit_registrations
FOR INSERT WITH CHECK (
  auth.uid() = student_id AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'student')
);

CREATE POLICY "Teachers can create units" ON public.units
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);

CREATE POLICY "Teachers can update their own units" ON public.units
FOR UPDATE USING (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);

CREATE POLICY "Teachers can delete their own units" ON public.units
FOR DELETE USING (
  created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('teacher', 'admin'))
);
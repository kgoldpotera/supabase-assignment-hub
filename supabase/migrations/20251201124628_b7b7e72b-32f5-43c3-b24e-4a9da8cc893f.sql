-- Create units table (courses/subjects created by teachers)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create unit_registrations table (students registering for units)
CREATE TABLE public.unit_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (unit_id, student_id)
);

-- Add unit_id to assignments table
ALTER TABLE public.assignments ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_registrations ENABLE ROW LEVEL SECURITY;

-- Units RLS policies
CREATE POLICY "Anyone authenticated can view units"
ON public.units FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Teachers can create units"
ON public.units FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can update their own units"
ON public.units FOR UPDATE
USING (created_by = auth.uid() AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Teachers can delete their own units"
ON public.units FOR DELETE
USING (created_by = auth.uid() AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));

-- Unit registrations RLS policies
CREATE POLICY "Students can view their own registrations"
ON public.unit_registrations FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view registrations for their units"
ON public.unit_registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = unit_id AND u.created_by = auth.uid()
  )
);

CREATE POLICY "Students can register for units"
ON public.unit_registrations FOR INSERT
WITH CHECK (auth.uid() = student_id AND public.has_role(auth.uid(), 'student'));

CREATE POLICY "Students can unregister from units"
ON public.unit_registrations FOR DELETE
USING (auth.uid() = student_id);

-- Update assignments policy - students only see assignments for registered units
DROP POLICY IF EXISTS "Anyone authenticated can view assignments" ON public.assignments;

CREATE POLICY "Teachers and admins can view all assignments"
ON public.assignments FOR SELECT
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view assignments for registered units"
ON public.assignments FOR SELECT
USING (
  public.has_role(auth.uid(), 'student') AND (
    unit_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.unit_registrations ur
      WHERE ur.unit_id = assignments.unit_id AND ur.student_id = auth.uid()
    )
  )
);

-- Add updated_at trigger for units
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
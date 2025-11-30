-- Create salary records table for admin tracking
CREATE TABLE public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month DATE NOT NULL,
  base_salary DECIMAL(10, 2) NOT NULL,
  bonus DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  total_salary DECIMAL(10, 2) GENERATED ALWAYS AS (base_salary + bonus - deductions) STORED,
  hours_worked DECIMAL(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Enable RLS
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

-- Only admins can view all salary records
CREATE POLICY "Admins can view all salaries"
ON public.salaries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage salary records
CREATE POLICY "Admins can manage salaries"
ON public.salaries
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_salaries_updated_at
BEFORE UPDATE ON public.salaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
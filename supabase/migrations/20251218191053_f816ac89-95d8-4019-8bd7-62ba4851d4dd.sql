-- Create sanitization function for notification messages
CREATE OR REPLACE FUNCTION public.sanitize_for_notification(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove potentially dangerous characters: quotes, newlines, tabs, control characters
  RETURN regexp_replace(
    COALESCE(input_text, ''),
    E'[\"\\n\\r\\t\\x00-\\x1F]',
    ' ',
    'g'
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.sanitize_for_notification(text) IS 'Sanitizes text for use in notification messages by removing quotes, newlines, and control characters';
-- Pinterest OAuth token storage (service-role only).
CREATE TABLE IF NOT EXISTS public.pinterest_auth (
  id text PRIMARY KEY DEFAULT 'default',
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pinterest_auth ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pinterest_auth FROM anon;
REVOKE ALL ON TABLE public.pinterest_auth FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pinterest_auth TO service_role;

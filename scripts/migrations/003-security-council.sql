CREATE TABLE IF NOT EXISTS security_scans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scanned_at timestamptz DEFAULT now(),
  repo text NOT NULL DEFAULT 'pontis-life',
  commit_sha text,
  files_analyzed int DEFAULT 0,
  total_findings int DEFAULT 0,
  critical_count int DEFAULT 0,
  high_count int DEFAULT 0,
  medium_count int DEFAULT 0,
  low_count int DEFAULT 0,
  status text DEFAULT 'pending', -- pending, running, complete, failed
  error text,
  raw_output jsonb
);

CREATE TABLE IF NOT EXISTS security_findings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id uuid REFERENCES security_scans(id) ON DELETE CASCADE,
  finding_number int NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  lens text NOT NULL CHECK (lens IN ('offensive', 'defensive', 'privacy', 'realism')),
  title text NOT NULL,
  description text NOT NULL,
  affected_files text[],
  remediation text,
  effort text CHECK (effort IN ('quick-fix', 'needs-design', 'major-refactor')),
  is_new boolean DEFAULT true,
  is_resolved boolean DEFAULT false,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_findings_scan_id_idx ON security_findings(scan_id);
CREATE INDEX IF NOT EXISTS security_findings_severity_idx ON security_findings(severity);

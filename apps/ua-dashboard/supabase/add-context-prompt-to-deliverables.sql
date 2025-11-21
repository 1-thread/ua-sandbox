-- Add context_prompt field to deliverables table
ALTER TABLE deliverables
ADD COLUMN IF NOT EXISTS context_prompt TEXT;


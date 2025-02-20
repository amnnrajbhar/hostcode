/*
  # Create code snippets table

  1. New Tables
    - `code_snippets`
      - `id` (uuid, primary key)
      - `code` (text, the actual code content)
      - `language` (text, programming language)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `code_snippets` table
    - Add policies for public read access
    - Add policies for public create access
*/

CREATE TABLE IF NOT EXISTS code_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  language text DEFAULT 'javascript',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access"
  ON code_snippets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public create access"
  ON code_snippets
  FOR INSERT
  TO public
  WITH CHECK (true);
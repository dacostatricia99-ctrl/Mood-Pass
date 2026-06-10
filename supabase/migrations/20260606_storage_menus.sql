-- Storage bucket for uploaded menu images.
--
-- OpenAI Vision fetches the image by URL, so the bucket is public (read).
-- Uploads are restricted to authenticated users (the managers).

INSERT INTO storage.buckets (id, name, public)
VALUES ('menus', 'menus', true)
ON CONFLICT (id) DO NOTHING;

-- Public read so the extracted image URL is reachable by the Vision function.
CREATE POLICY "Menu images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'menus');

-- Authenticated managers can upload menu images.
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menus');

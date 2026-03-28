-- Add image_url column to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('question-images', 'question-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy - everyone can view (public bucket)
CREATE POLICY "Public Access question-images" ON storage.objects FOR SELECT USING (bucket_id = 'question-images');

-- Storage policy - only admin and super_admin can upload
CREATE POLICY "Admin Upload question-images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'question-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Storage policy - admin can delete
CREATE POLICY "Admin Delete question-images" ON storage.objects FOR DELETE USING (
  bucket_id = 'question-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

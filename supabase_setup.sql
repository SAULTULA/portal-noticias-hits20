-- 1. Crear la tabla de mapeo de páginas
CREATE TABLE fb_pages_mapping (
    id SERIAL PRIMARY KEY,
    page_url TEXT NOT NULL UNIQUE,
    target_website TEXT NOT NULL,
    target_section TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear la tabla de publicaciones (posts)
CREATE TABLE fb_posts (
    id SERIAL PRIMARY KEY,
    page_url TEXT NOT NULL REFERENCES fb_pages_mapping(page_url) ON DELETE CASCADE,
    post_id TEXT UNIQUE, -- ID único del post en Facebook
    titulo TEXT,
    cuerpo TEXT,
    media_url TEXT,   -- URL pública de imagen en Supabase Storage (thumbnail)
    video_url TEXT,   -- URL pública del VIDEO en Supabase Storage (solo si es video)
    media_type TEXT,  -- 'video', 'image', 'none'
    fecha_publicacion TIMESTAMP WITH TIME ZONE,
    target_website TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Si la tabla ya existe, correr esto para agregar el campo video_url:
-- ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 3. Habilitar RLS (Row Level Security) para fb_posts (Permitir lectura pública)
ALTER TABLE fb_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica de fb_posts"
ON fb_posts FOR SELECT
TO public
USING (true);

-- 4. Habilitar Supabase Realtime para la tabla fb_posts
alter publication supabase_realtime add table fb_posts;

-- ==========================================
-- INSTRUCCIONES PARA EL STORAGE (BUCKET)
-- ==========================================
-- 1. Ve a "Storage" en tu panel de Supabase.
-- 2. Haz clic en "New Bucket".
-- 3. Nombre del bucket: "facebook_media" (SIN comillas, en minúsculas).
-- 4. ¡MUY IMPORTANTE!: Asegúrate de activar la opción "Public bucket" (Bucket público) para que las imágenes y videos se puedan ver en la web.
-- 5. Guarda el bucket.

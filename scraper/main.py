import os
import json
import subprocess
import tempfile
import urllib.request
from datetime import datetime
from supabase import create_client, Client

# Configuración Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Credenciales de Supabase no configuradas en las variables de entorno.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "facebook_media"

def upload_to_supabase(file_path, dest_path, content_type):
    """Sube un archivo local a Supabase Storage y retorna la URL pública"""
    with open(file_path, "rb") as f:
        supabase.storage.from_(BUCKET_NAME).upload(
            file=f,
            path=dest_path,
            file_options={"content-type": content_type}
        )
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{dest_path}"

def get_posts_from_page(page_url):
    """Usa yt-dlp para extraer las últimas publicaciones de la página"""
    print(f"Scrapeando página: {page_url}")
    # Nota: yt-dlp puede requerir cookies si Facebook bloquea la IP de GitHub Actions.
    # Comando: yt-dlp --dump-json --playlist-end 3 <URL>
    command = [
        "yt-dlp",
        "--dump-json",
        "--playlist-end", "3",
        "--ignore-errors",
        "--no-warnings",
        page_url
    ]
    
    posts = []
    try:
        result = subprocess.run(command, capture_output=True, text=True)
        for line in result.stdout.split('\n'):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                posts.append(data)
            except json.JSONDecodeError:
                continue
    except Exception as e:
        print(f"Error ejecutando yt-dlp en {page_url}: {e}")
        
    return posts

def process_page(mapping):
    page_url = mapping['page_url']
    target_website = mapping['target_website']
    
    posts = get_posts_from_page(page_url)
    
    for post in posts:
        post_id = post.get('id')
        if not post_id:
            continue
            
        # Verificar si el post ya existe en Supabase
        existing = supabase.table("fb_posts").select("id").eq("post_id", post_id).execute()
        if existing.data:
            print(f"Post {post_id} ya existe. Saltando...")
            continue
            
        print(f"Procesando nuevo post: {post_id}")
        
        titulo = post.get('title', 'Sin título')
        cuerpo = post.get('description', '')
        media_url = ""
        media_type = "none"
        
        # Procesar media
        # yt-dlp devuelve 'url' para videos, o 'thumbnails'
        is_video = post.get('vcodec') != 'none' and post.get('vcodec') is not None
        
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                if is_video:
                    media_type = "video"
                    filename = f"{post_id}.mp4"
                    temp_path = os.path.join(temp_dir, filename)
                    # Descargar video
                    subprocess.run(["yt-dlp", "-o", temp_path, post.get('webpage_url', '')])
                    if os.path.exists(temp_path):
                        dest_path = f"videos/{filename}"
                        media_url = upload_to_supabase(temp_path, dest_path, "video/mp4")
                else:
                    # Intentar obtener la mejor imagen
                    thumbnails = post.get('thumbnails', [])
                    if thumbnails:
                        best_thumb = thumbnails[-1].get('url')
                        if best_thumb:
                            media_type = "image"
                            filename = f"{post_id}.jpg"
                            temp_path = os.path.join(temp_dir, filename)
                            urllib.request.urlretrieve(best_thumb, temp_path)
                            dest_path = f"images/{filename}"
                            media_url = upload_to_supabase(temp_path, dest_path, "image/jpeg")
        except Exception as e:
            print(f"Error procesando media para {post_id}: {e}")
            
        # Insertar en base de datos
        supabase.table("fb_posts").insert({
            "page_url": page_url,
            "post_id": post_id,
            "titulo": titulo[:255] if titulo else "",
            "cuerpo": cuerpo,
            "media_url": media_url,
            "media_type": media_type,
            "target_website": target_website,
            "fecha_publicacion": datetime.utcfromtimestamp(post.get('timestamp', datetime.utcnow().timestamp())).isoformat()
        }).execute()
        print(f"Post {post_id} insertado correctamente.")

def main():
    print("Iniciando scraper...")
    # 1. Obtener páginas a procesar desde Supabase
    response = supabase.table("fb_pages_mapping").select("*").execute()
    mappings = response.data
    
    if not mappings:
        print("No se encontraron páginas configuradas en fb_pages_mapping.")
        return
        
    print(f"Se encontraron {len(mappings)} páginas para procesar.")
    
    for mapping in mappings:
        process_page(mapping)
        
    print("Scraping finalizado.")

if __name__ == "__main__":
    main()

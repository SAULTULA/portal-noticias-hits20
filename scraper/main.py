import os
import requests
import json
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
APIFY_TOKEN = os.environ.get("APIFY_TOKEN")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL o SUPABASE_KEY no definidos.")
    exit(1)

if not APIFY_TOKEN:
    print("Error: APIFY_TOKEN no definido.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

FACEBOOK_URL = "https://www.facebook.com/hits20radio/"

def scrape_facebook_apify():
    print("Iniciando scraper vía Apify...")
    
    url = f"https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    
    payload = {
        "startUrls": [{"url": FACEBOOK_URL}],
        "resultsLimit": 3
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        # Petición a Apify (esperará sincrónicamente a que el scraper termine)
        print("Llamando a la API de Apify... esto puede tardar entre 30s y 2 minutos.")
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        items = response.json()
        print(f"Apify devolvió {len(items)} publicaciones.")
        
        posts_to_insert = []
        for idx, item in enumerate(items):
            # Parsear datos de Apify (el formato puede variar un poco, extraemos lo básico)
            post_id = item.get("postId") or f"fb_post_{idx}"
            text = item.get("text", "")
            
            # Intentar obtener la mejor imagen (thumbnail o image de los attachments)
            image_url = ""
            media_type = "image"
            
            if item.get("images") and len(item.get("images")) > 0:
                image_url = item["images"][0]
            elif item.get("videoUrl"):
                image_url = item.get("videoThumbnail", "")
                media_type = "video"
            
            # Fecha (usualmente viene en ISO)
            created_at = item.get("time") or datetime.utcnow().isoformat()
            
            post_url = item.get("url") or FACEBOOK_URL
            
            # Construimos el objeto para Supabase
            posts_to_insert.append({
                "post_id": post_id,
                "page_url": FACEBOOK_URL,
                "titulo": "Publicación de Hits20Radio",
                "cuerpo": text[:500] + ("..." if len(text) > 500 else ""),
                "media_url": image_url,
                "media_type": media_type,
                "fecha_publicacion": created_at,
                "target_website": "hits20radioonline.com.ar"
            })

        if posts_to_insert:
            print("Guardando datos en Supabase...")
            # 1. Asegurar que la página exista en fb_pages_mapping
            try:
                supabase.table("fb_pages_mapping").upsert({
                    "page_url": FACEBOOK_URL,
                    "target_website": "hits20radioonline.com.ar",
                    "target_section": "Inicio"
                }, on_conflict="page_url").execute()
            except Exception as e:
                print("Nota: Fallo al asegurar fb_pages_mapping (quizás ya existe):", str(e))
                
            # 2. Insertar nuevos posts. Ignorar si el post_id ya existe
            for p in posts_to_insert:
                try:
                    supabase.table("fb_posts").upsert(p, on_conflict="post_id").execute()
                except Exception as e:
                    print("Error upserting:", str(e))
            print("Datos guardados exitosamente.")
        else:
            print("No se encontraron posts válidos para insertar.")

    except Exception as e:
        print(f"[error] Falló la ejecución de Apify: {str(e)}")
        if hasattr(e, 'response') and getattr(e, 'response') is not None:
            print(f"Respuesta de Apify: {e.response.text}")

if __name__ == "__main__":
    scrape_facebook_apify()

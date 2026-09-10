import os
import requests
import json
import uuid
from datetime import datetime
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
APIFY_TOKEN  = os.environ.get("APIFY_TOKEN")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL o SUPABASE_KEY no definidos.")
    exit(1)

if not APIFY_TOKEN:
    print("Error: APIFY_TOKEN no definido.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

FACEBOOK_URL   = "https://www.facebook.com/hits20radio/"
STORAGE_BUCKET = "facebook_media"
MAX_VIDEO_MB   = 80  # Límite de tamaño de video en MB (free tier Supabase = 50 MB por archivo)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# ──────────────────────────────────────────────────────────────
#  Descarga un archivo (imagen o video) y lo sube a Supabase
#  Storage. Devuelve la URL pública o "" si falla.
# ──────────────────────────────────────────────────────────────
def subir_a_storage(url_origen: str, nombre_archivo: str) -> str:
    if not url_origen:
        return ""
    try:
        r = requests.get(url_origen, headers=HEADERS, timeout=60, stream=True)
        if r.status_code != 200:
            print(f"  [storage] HTTP {r.status_code} descargando {url_origen[:70]}")
            return ""

        content_type = r.headers.get("Content-Type", "application/octet-stream")

        # Verificar tamaño para videos (evitar archivos enormes)
        content_length = int(r.headers.get("Content-Length", 0))
        if content_length > MAX_VIDEO_MB * 1024 * 1024:
            print(f"  [storage] Video demasiado grande ({content_length/1024/1024:.1f} MB), se omite.")
            return ""

        file_bytes = r.content

        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=nombre_archivo,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )

        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{nombre_archivo}"
        print(f"  [storage] ✓ Subido: {public_url[:80]}")
        return public_url

    except Exception as e:
        print(f"  [storage] Error: {e}")
        return ""


def scrape_facebook_apify():
    print("Iniciando scraper vía Apify...")

    url = (
        "https://api.apify.com/v2/acts/apify~facebook-posts-scraper"
        f"/run-sync-get-dataset-items?token={APIFY_TOKEN}"
    )
    payload = {
        "startUrls":    [{"url": FACEBOOK_URL}],
        "resultsLimit": 3
    }

    try:
        print("Llamando a la API de Apify... (puede tardar 1–2 minutos)")
        response = requests.post(
            url, json=payload,
            headers={"Content-Type": "application/json"},
            timeout=240
        )
        response.raise_for_status()

        items = response.json()
        print(f"Apify devolvió {len(items)} publicaciones.")

        # DEBUG: estructura del primer resultado
        if items:
            print(f"[DEBUG] Claves: {list(items[0].keys())}")
            print(f"[DEBUG] Item 0:\n{json.dumps(items[0], default=str, indent=2)[:2000]}")

        # ── Asegurar fila en fb_pages_mapping ──
        try:
            supabase.table("fb_pages_mapping").upsert({
                "page_url":       FACEBOOK_URL,
                "target_website": "hits20radioonline.com.ar",
                "target_section": "Inicio"
            }, on_conflict="page_url").execute()
        except Exception as e:
            print(f"  [mapping] {e}")

        # ── Procesar cada post ──
        for idx, item in enumerate(items):
            post_id = (item.get("postId") or f"fb_post_{idx}").replace("/", "_")
            text    = item.get("text") or item.get("postText") or ""

            # ── Detectar imagen ──
            fb_img_url = (
                item.get("image")
                or (item.get("images") or [None])[0]
                or item.get("full_picture")
                or ""
            )

            # ── Detectar video ──
            fb_video_url = (
                item.get("videoUrl")
                or (item.get("video") or {}).get("url", "")
                or ""
            )
            is_video = bool(fb_video_url)

            if is_video and not fb_img_url:
                # Usar el thumbnail del video como imagen de portada
                fb_img_url = (
                    item.get("videoThumbnail")
                    or (item.get("video") or {}).get("thumbnail", "")
                    or ""
                )

            media_type  = "video" if is_video else "image"
            created_at  = item.get("time") or datetime.utcnow().isoformat()
            post_url    = item.get("url") or FACEBOOK_URL

            print(f"\n── Post {idx+1} ─────────────────────────────────")
            print(f"  id       : {post_id}")
            print(f"  tipo     : {media_type}")
            print(f"  img_src  : {str(fb_img_url)[:70]}")
            print(f"  video_src: {str(fb_video_url)[:70]}")

            # ── Subir imagen (thumbnail / portada) a Supabase Storage ──
            ext_img        = "jpg"
            stored_img_url = subir_a_storage(fb_img_url, f"{post_id}_thumb.{ext_img}")

            # ── Subir video a Supabase Storage (si existe y no es muy grande) ──
            stored_video_url = ""
            if fb_video_url:
                # Detectar extensión del video (mp4 por defecto)
                ext_vid = "mp4"
                if ".webm" in fb_video_url:
                    ext_vid = "webm"
                stored_video_url = subir_a_storage(fb_video_url, f"{post_id}.{ext_vid}")

            row = {
                "post_id":           post_id,
                "page_url":          FACEBOOK_URL,
                "titulo":            "Hits20Radio",
                "cuerpo":            text[:1000] + ("..." if len(text) > 1000 else ""),
                "media_url":         stored_img_url,   # thumbnail/imagen de portada
                "video_url":         stored_video_url,  # video completo (puede ser "")
                "media_type":        media_type,
                "fecha_publicacion": created_at,
                "target_website":    "hits20radioonline.com.ar"
            }

            try:
                supabase.table("fb_posts").upsert(row, on_conflict="post_id").execute()
                print(f"  [DB] ✓ Guardado")
            except Exception as e:
                print(f"  [DB] Error: {e}")

        print("\n✅ Scraping finalizado.")

    except Exception as e:
        print(f"[ERROR FATAL] {e}")


if __name__ == "__main__":
    scrape_facebook_apify()

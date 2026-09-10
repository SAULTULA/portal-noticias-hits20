import os
import re
import urllib.request
import tempfile
from datetime import datetime, timezone
from xml.etree import ElementTree as ET
from supabase import create_client, Client

# ── Configuración ────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Credenciales de Supabase no configuradas en las variables de entorno.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "facebook_media"

# Mapeo: page_url en Supabase → URL del feed RSS que la representa
# Agregá tantas filas como páginas tengas en fb_pages_mapping
RSS_MAP = {
    "https://www.facebook.com/hits20radio/": "https://rss.app/feeds/a0CU7nQs9g8nXGIV.xml",
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def extraer_imagen_de_descripcion(descripcion: str) -> str:
    """Busca el primer <img src="..."> dentro del HTML del campo description."""
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', descripcion or "")
    return match.group(1) if match else ""


def extraer_texto_plano(html: str) -> str:
    """Elimina etiquetas HTML y devuelve texto limpio."""
    return re.sub(r"<[^>]+>", "", html or "").strip()


def upload_imagen_to_supabase(img_url: str, post_id: str) -> str:
    """Descarga una imagen y la sube a Supabase Storage. Retorna URL pública."""
    try:
        filename = f"{post_id}.jpg"
        with tempfile.TemporaryDirectory() as tmpdir:
            local_path = os.path.join(tmpdir, filename)
            req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp, open(local_path, "wb") as f:
                f.write(resp.read())
            dest = f"images/{filename}"
            with open(local_path, "rb") as f:
                supabase.storage.from_(BUCKET_NAME).upload(
                    file=f,
                    path=dest,
                    file_options={"content-type": "image/jpeg", "upsert": "true"},
                )
            return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{dest}"
    except Exception as e:
        print(f"  [warn] No se pudo subir imagen: {e}")
        return img_url  # Devuelve la URL original como fallback


def parsear_fecha(fecha_str: str) -> str:
    """Convierte fecha RFC-822 de RSS a ISO-8601 para Supabase."""
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(fecha_str).astimezone(timezone.utc).isoformat()
    except Exception:
        return datetime.now(timezone.utc).isoformat()


# ── Lógica principal ──────────────────────────────────────────────────────────
def procesar_feed(page_url: str, rss_url: str, target_website: str):
    print(f"  Leyendo feed RSS: {rss_url}")
    try:
        req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            xml_content = resp.read()
    except Exception as e:
        print(f"  [error] No se pudo descargar el feed: {e}")
        return

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"  [error] XML inválido: {e}")
        return

    items = root.findall(".//item")
    print(f"  Se encontraron {len(items)} ítems en el feed.")

    for item in items[:10]:  # Procesar máximo 10 por ciclo
        guid = (item.findtext("guid") or item.findtext("link") or "").strip()
        if not guid:
            continue

        # Verificar si ya existe
        existing = supabase.table("fb_posts").select("id").eq("post_id", guid).execute()
        if existing.data:
            print(f"  Post {guid[:60]}... ya existe. Saltando.")
            continue

        titulo_raw  = item.findtext("title") or "Publicación de Facebook"
        fecha_raw   = item.findtext("pubDate") or ""
        desc_raw    = item.findtext("description") or ""
        enlace      = item.findtext("link") or page_url

        titulo = extraer_texto_plano(titulo_raw)[:255]
        cuerpo = extraer_texto_plano(desc_raw)
        fecha  = parsear_fecha(fecha_raw)

        # Intentar extraer imagen del campo description
        img_url_original = extraer_imagen_de_descripcion(desc_raw)

        media_url  = ""
        media_type = "none"

        if img_url_original:
            media_type = "image"
            post_slug  = re.sub(r"[^a-zA-Z0-9]", "_", guid)[-60:]
            media_url  = upload_imagen_to_supabase(img_url_original, post_slug)

        supabase.table("fb_posts").insert({
            "page_url":          page_url,
            "post_id":           guid,
            "titulo":            titulo,
            "cuerpo":            cuerpo,
            "media_url":         media_url,
            "media_type":        media_type,
            "target_website":    target_website,
            "fecha_publicacion": fecha,
        }).execute()

        print(f"  ✓ Post insertado: {titulo[:70]}")


def main():
    print("Iniciando scraper (modo RSS)...")
    response = supabase.table("fb_pages_mapping").select("*").execute()
    mappings = response.data

    if not mappings:
        print("No se encontraron páginas en fb_pages_mapping.")
        return

    print(f"Se encontraron {len(mappings)} página(s) para procesar.")

    for mapping in mappings:
        page_url       = mapping["page_url"]
        target_website = mapping.get("target_website", "portal_hits20")
        rss_url        = RSS_MAP.get(page_url)

        if not rss_url:
            print(f"[warn] No hay RSS configurado para: {page_url}")
            continue

        print(f"\nProcesando: {page_url}")
        procesar_feed(page_url, rss_url, target_website)

    print("\nScraping finalizado.")


if __name__ == "__main__":
    main()

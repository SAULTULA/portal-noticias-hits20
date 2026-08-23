// URL de tu ejecutable de Google Apps Script para Minuto Uno
const urlAppsScriptMinutoUno = "https://script.google.com/macros/s/AKfycbwxGlsBqjU8Kq0g9x-J3c94y719y3X03f7X2t721_4l6l6/exec"; // Reemplaza si necesitas actualizar el ID de tu despliegue

// Feeds RSS
const urlRssFacebook = "https://rss.app/feeds/a0CU7nQs9g8nXGIV.xml";
const urlRssProvinciales = "https://rss.app/feeds/3Lz2o1aN7H4pX5mL.xml"; // Reemplaza por tu feed RSS provincial si es diferente
const urlRssNacionales = "https://rss.app/feeds/nacionales.xml";        // Reemplaza por tu feed RSS nacional si es diferente
const urlRssInternacionales = "https://rss.app/feeds/internacionales.xml"; // Reemplaza por tu feed RSS internacional si es diferente

const imgFallback = "logo.png";

document.addEventListener("DOMContentLoaded", function () {
    cargarNoticiasFacebook();
    cargarNoticiasRSS('grid-provinciales', urlRssProvinciales, 'Provincial');
    cargarNoticiasRSS('grid-nacionales', urlRssNacionales, 'Nacional');
    cargarNoticiasRSS('grid-internacionales', urlRssInternacionales, 'Internacional');
    cargarNoticiasMinutoUno();

    const audio = document.getElementById('audio-stream');
    if (audio) {
        audio.volume = 0.4;
    }
});

// -------------------------------------------------------------
// 1. NOTICIAS FACEBOOK HITS 20 (MÁXIMO 3)
// -------------------------------------------------------------
async function cargarNoticiasFacebook() {
    const contenedor = document.getElementById('grid-facebook');
    if (!contenedor) return;

    try {
        const response = await fetch(urlRssFacebook);
        const strText = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(strText, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 3); // Exactamente 3

        contenedor.innerHTML = '';

        if (items.length === 0) {
            contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay publicaciones recientes de Facebook.</p>';
            return;
        }

        items.forEach(item => {
            const titulo = item.querySelector("title")?.textContent || "Publicación de Facebook";
            const enlace = item.querySelector("link")?.textContent || "#";
            const pubDate = item.querySelector("pubDate")?.textContent || "";
            
            let imagenUrl = imgFallback;
            const mediaContent = item.getElementsByTagName("media:content")[0] || item.getElementsByTagName("media:thumbnail")[0];
            
            if (mediaContent && mediaContent.getAttribute("url")) {
                imagenUrl = mediaContent.getAttribute("url");
            } else {
                const descripcion = item.querySelector("description")?.textContent || "";
                const imgMatch = descripcion.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    imagenUrl = imgMatch[1];
                }
            }

            const card = document.createElement('article');
            card.className = 'card-noticia';

            card.innerHTML = `
                <div class="card-image-box">
                    <img src="${imagenUrl}" alt="${titulo}" onerror="this.src='${imgFallback}'">
                </div>
                <div class="card-body">
                    <span class="badge" style="background: #1877f2; color: #fff;">Facebook</span>
                    ${pubDate ? `<span style="font-size: 0.75rem; color: #777; display: block; margin-top: 5px;">${formatearFechaYHora(pubDate)}</span>` : ''}
                    <h3>${titulo}</h3>
                    <a href="${enlace}" target="_blank" rel="noopener noreferrer" class="btn-read-more" style="display: inline-block; margin-top: 10px; background: #1877f2; color: #fff; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 0.85rem; font-weight: bold;">
                        Ver en Facebook ↗
                    </a>
                </div>
            `;

            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar publicaciones de Facebook:", err);
        contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No se pudieron obtener las publicaciones de Facebook.</p>';
    }
}

// -------------------------------------------------------------
// 2. NOTICIAS GENERALES RSS (PROVINCIALES, NACIONALES, INTERNACIONALES) - MÁXIMO 3 DE CADA UNA
// -------------------------------------------------------------
async function cargarNoticiasRSS(idContenedor, urlRss, categoriaNombre) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    try {
        const response = await fetch(urlRss);
        const strText = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(strText, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 3); // Carga 3 noticias por sección

        contenedor.innerHTML = '';

        if (items.length === 0) {
            contenedor.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No hay noticias disponibles en ${categoriaNombre}.</p>`;
            return;
        }

        items.forEach(item => {
            const titulo = item.querySelector("title")?.textContent || "Sin título";
            const enlace = item.querySelector("link")?.textContent || "#";
            const pubDate = item.querySelector("pubDate")?.textContent || "";
            
            let imagenUrl = imgFallback;
            const mediaContent = item.getElementsByTagName("media:content")[0] || item.getElementsByTagName("media:thumbnail")[0];
            
            if (mediaContent && mediaContent.getAttribute("url")) {
                imagenUrl = mediaContent.getAttribute("url");
            } else {
                const descripcion = item.querySelector("description")?.textContent || "";
                const imgMatch = descripcion.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch && imgMatch[1]) {
                    imagenUrl = imgMatch[1];
                }
            }

            const card = document.createElement('article');
            card.className = 'card-noticia';

            card.innerHTML = `
                <div class="card-image-box">
                    <img src="${imagenUrl}" alt="${titulo}" onerror="this.src='${imgFallback}'">
                </div>
                <div class="card-body">
                    <span class="badge">${categoriaNombre}</span>
                    ${pubDate ? `<span style="font-size: 0.75rem; color: #777; display: block; margin-top: 5px;">${formatearFechaYHora(pubDate)}</span>` : ''}
                    <h3>${titulo}</h3>
                    <a href="${enlace}" target="_blank" rel="noopener noreferrer" class="btn-read-more" style="display: inline-block; margin-top: 10px; text-decoration: none; font-size: 0.85rem; font-weight: bold;">
                        Leer más ↗
                    </a>
                </div>
            `;

            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error(`Error al cargar ${categoriaNombre}:`, err);
        contenedor.innerHTML = `<p style="color: #666; font-size: 0.9rem;">No se pudieron obtener las noticias de ${categoriaNombre}.</p>`;
    }
}

// -------------------------------------------------------------
// 3. NOTICIAS MINUTO ONE (DESDE APPS SCRIPT)
// -------------------------------------------------------------
async function cargarNoticiasMinutoUno() {
    const contenedor = document.getElementById('grid-minutouno');
    if (!contenedor) return;

    try {
        const response = await fetch(urlAppsScriptMinutoUno);
        const data = await response.json();

        contenedor.innerHTML = '';

        if (!data || data.length === 0) {
            contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay noticias disponibles en este momento.</p>';
            return;
        }

        data.forEach(noticia => {
            const card = document.createElement('article');
            card.className = 'card-noticia';

            card.innerHTML = `
                <div class="card-image-box">
                    <img src="${noticia.imagen || noticia.Imagen}" alt="${noticia.titulo || noticia.Noticia}" onerror="this.src='${imgFallback}'">
                </div>
                <div class="card-body">
                    <span class="badge">${noticia.seccion || noticia.categoria || 'Minuto 1'}</span>
                    <h3>${noticia.titulo || noticia.Noticia}</h3>
                    <a href="${noticia.enlace || noticia.Enlace}" target="_blank" rel="noopener noreferrer" class="btn-read-more" style="display: inline-block; margin-top: 10px; text-decoration: none; font-size: 0.85rem; font-weight: bold;">
                        Leer más ↗
                    </a>
                </div>
            `;

            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar Noticias Minuto 1:", err);
        contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No se pudieron obtener las noticias de Minuto 1.</p>';
    }
}

// -------------------------------------------------------------
// FUNCIONES AUXILIARES & REPRODUCTOR
// -------------------------------------------------------------
function formatearFechaYHora(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return fechaStr;
    return fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function abrirPlayer() {
    const modal = document.getElementById('radio-modal-flotante');
    if (modal) modal.style.display = 'block';
}

function cerrarPlayer() {
    const modal = document.getElementById('radio-modal-flotante');
    if (modal) modal.style.display = 'none';
}

function cambiarVolumen(val) {
    const audio = document.getElementById('audio-stream');
    const label = document.getElementById('volumeValue');
    if (audio) audio.volume = val / 100;
    if (label) label.textContent = val;
}

function abrirModalOtrasLoc() {
    const modal = document.getElementById('modal-otras-loc');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalOtrasLoc() {
    const modal = document.getElementById('modal-otras-loc');
    if (modal) modal.style.display = 'none';
}

function filterNews() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.card-noticia');

    cards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        if (title.includes(input)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

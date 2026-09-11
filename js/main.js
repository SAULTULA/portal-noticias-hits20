// URLs de ejecutables de Google Apps Script
const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";
// URL corregida de Minuto 1 (sin caracteres extra al final)
const urlAppsScriptMinutoUno = "https://script.google.com/macros/s/AKfycbxs3faetjE3Lykcbu1L0Idvunvol-5-UMGbSIFkDJOgmjlPf45HUN73sLvypAKXe1-Zfg/exec";

// Feed RSS de Facebook (Obsoleto, ahora usamos Supabase)
// const urlRssFacebook = "https://rss.app/feeds/a0CU7nQs9g8nXGIV.xml";
const imgFallback = "logo.png";

let todasLasNoticias = [];




document.addEventListener("DOMContentLoaded", function () {
    // 1. Carga de Noticias de Apps Script (Provinciales, Nacionales, Internacionales)
    cargarNoticiasAppsScript();

    // 2. Carga de Minuto 1, Facebook y Publicidades
    cargarDatosSecundarios();

    // 3. Reproductor
    const audio = document.getElementById('audio-stream');
    if (audio) {
        audio.volume = 0.4;
    }

    inicializarArrastrePlayer();
    
    // 4. Modal de Admin Ads
    inicializarAdminAds();
});

// -------------------------------------------------------------
// 1. APPS SCRIPT: PROVINCIALES, NACIONALES E INTERNACIONALES
// -------------------------------------------------------------
function cargarNoticiasAppsScript() {
    fetch(urlAPI)
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data)) return;
            todasLasNoticias = data;
            renderizarNoticiasAppsScript(todasLasNoticias);

            const urlParams = new URLSearchParams(window.location.search);
            const noticiaId = urlParams.get('id');
            if (noticiaId) {
                const encontrada = data.find(n => String(n.id) === String(noticiaId));
                if (encontrada) abrirNoticiaModal(encontrada);
            }
        })
        .catch(error => console.error('Error al conectar con la API de noticias:', error));
}

function renderizarNoticiasAppsScript(listaParaPintar) {
    const nacionales = document.getElementById('grid-nacionales');
    const internacionales = document.getElementById('grid-internacionales');
    const provinciales = document.getElementById('grid-provinciales');

    if (nacionales) nacionales.innerHTML = '';
    if (internacionales) internacionales.innerHTML = '';
    if (provinciales) provinciales.innerHTML = '';

    const ahora = new Date();
    // Ajustado exactamente a 72 horas (72h * 60m * 60s * 1000ms)
    const limite72Horas = 72 * 60 * 60 * 1000;
    const searchInputEl = document.getElementById('searchInput');
    const terminoBusqueda = searchInputEl ? searchInputEl.value.trim() : '';

    const listaOrdenada = [...listaParaPintar].sort((a, b) => {
        const fechaA = new Date(a.fecha || a.Fecha).getTime() || 0;
        const fechaB = new Date(b.fecha || b.Fecha).getTime() || 0;
        if (fechaB !== fechaA) return fechaB - fechaA;
        const horaA = a.hora || a.Hora || "00:00";
        const horaB = b.hora || b.Hora || "00:00";
        return horaB.localeCompare(horaA);
    });

    listaOrdenada.forEach(noticia => {
        const categoria = (noticia.categoria || '').toLowerCase().trim();
        let contenedor = null;

        if (categoria.includes('internacional')) contenedor = internacionales;
        else if (categoria.includes('nacional')) contenedor = nacionales;
        else if (categoria.includes('provincial')) contenedor = provinciales;

        if (contenedor) {
            const fechaCruda = noticia.fecha || noticia.Fecha;
            const fechaNoticia = new Date(fechaCruda || 0);
            
            // Si tiene más de 72 horas y no hay búsqueda activa, se descarta
            const esMasDe72Horas = (ahora.getTime() - fechaNoticia.getTime()) > limite72Horas;
            if (esMasDe72Horas && !terminoBusqueda) return;

            const card = document.createElement('article');
            card.className = 'card-noticia';
            card.style.cursor = 'pointer';

            const fechaTexto = formatearFechaYHora(fechaCruda, noticia.hora || noticia.Hora);

            // SEC-003: construir la tarjeta via DOM, sin innerHTML con datos externos
            const imageBox = document.createElement('div');
            imageBox.className = 'card-image-box';
            imageBox.style.cssText = 'width: 100%; height: 160px; overflow: hidden; background: #000;';
            agregarMultimediaDOM(imageBox, noticia.video || noticia.Video, noticia.imagen || noticia.Imagen);

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';
            cardBody.style.padding = '12px';

            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.style.cssText = 'background: #d9534f; color: #fff;';
            badge.textContent = noticia.categoria || 'Noticia';

            const fechaDiv = document.createElement('div');
            fechaDiv.style.cssText = 'font-size: 0.75rem; color: #777; margin-top: 4px;';
            fechaDiv.textContent = fechaTexto;

            const titulo = document.createElement('h3');
            titulo.style.cssText = 'font-weight: 600; font-size: 0.9rem; margin-top: 6px;';
            titulo.textContent = noticia.titulo || 'Sin título';

            const desc = document.createElement('p');
            desc.style.cssText = 'font-size: 0.8rem; color: #555; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
            desc.textContent = noticia.descripcion || '';

            cardBody.appendChild(badge);
            cardBody.appendChild(fechaDiv);
            cardBody.appendChild(titulo);
            cardBody.appendChild(desc);
            card.appendChild(imageBox);
            card.appendChild(cardBody);

            card.addEventListener('click', () => abrirNoticiaModal(noticia));
            contenedor.appendChild(card);
        }
    });
}

/**
 * SEC-003: Agrega contenido multimedia al contenedor via DOM seguro (sin innerHTML con datos externos).
 */
function agregarMultimediaDOM(contenedor, urlVideo, urlImagen) {
    contenedor.textContent = '';
    if (urlVideo && urlVideo.trim() !== "") {
        const videoUrl = urlVideo.trim();
        let videoId = null;

        if (videoUrl.includes("youtube.com/watch?v=")) {
            videoId = videoUrl.split("v=")[1]?.split("&")[0];
        } else if (videoUrl.includes("youtu.be/")) {
            videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
        }

        if (videoId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
            iframe.allowFullscreen = true;
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
            contenedor.appendChild(iframe);
        } else {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.controls = true;
            video.style.cssText = 'width: 100%; height: 100%; object-fit: cover; background: #000;';
            contenedor.appendChild(video);
        }
    } else {
        const img = document.createElement('img');
        img.src = urlImagen || imgFallback;
        img.alt = 'Imagen noticia';
        img.loading = 'lazy';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
        img.addEventListener('error', function () { this.src = imgFallback; });
        contenedor.appendChild(img);
    }
}

/**
 * Versión legacy de obtenerHtmlMultimedia – mantenida para compatibilidad interna.
 * Solo se usa para iframes de YouTube cuyos IDs son generados internamente (seguros).
 */
function obtenerHtmlMultimedia(urlVideo, urlImagen) {
    if (urlVideo && urlVideo.trim() !== "") {
        const videoUrl = urlVideo.trim();
        if (videoUrl.includes("youtube.com/watch?v=")) {
            const videoId = videoUrl.split("v=")[1]?.split("&")[0];
            if (videoId) return `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" style="width: 100%; height: 100%; border: none;" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
        } else if (videoUrl.includes("youtu.be/")) {
            const videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
            if (videoId) return `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}" style="width: 100%; height: 100%; border: none;" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
        }
        return `<video src="${urlVideo}" controls style="width: 100%; height: 100%; object-fit: cover; background: #000;"></video>`;
    }
    return `<img src="${urlImagen || imgFallback}" alt="Imagen noticia" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
}

// -------------------------------------------------------------
// 2. MODAL DE NOTICIAS GENERAL
// -------------------------------------------------------------
function abrirNoticiaModal(noticia) {
    const elCategoria = document.getElementById('modal-categoria');
    const elTitulo = document.getElementById('modal-titulo');
    const elCuerpo = document.getElementById('modal-cuerpo');
    const elFecha = document.getElementById('modal-fecha');
    const modalImagenElem = document.getElementById('modal-imagen');

    // Ocultar botón de enlace externo en noticias normales
    const btnExterno = document.getElementById('btn-modal-externo');
    if (btnExterno) btnExterno.style.display = 'none';

    // SEC-003: usar textContent para datos externos
    if (elCategoria) elCategoria.textContent = noticia.categoria || '';
    if (elTitulo) elTitulo.textContent = noticia.titulo || '';
    if (elCuerpo) elCuerpo.textContent = noticia.cuerpo || noticia.descripcion || '';
    if (elFecha) elFecha.textContent = formatearFechaYHora(noticia.fecha || noticia.Fecha, noticia.hora || noticia.Hora);

    if (modalImagenElem) {
        const parentModalImg = modalImagenElem.parentNode;
        let videoContainerModal = document.getElementById('modal-video-container');

        if (noticia.video && noticia.video.trim() !== "") {
            if (!videoContainerModal) {
                videoContainerModal = document.createElement('div');
                videoContainerModal.id = 'modal-video-container';
                videoContainerModal.style.width = '100%';
                videoContainerModal.style.height = '300px';
                videoContainerModal.style.background = '#000';
                videoContainerModal.style.marginBottom = '15px';
                parentModalImg.insertBefore(videoContainerModal, modalImagenElem);
            }
            // SEC-003: usar DOM seguro
            agregarMultimediaDOM(videoContainerModal, noticia.video, noticia.imagen);
            modalImagenElem.style.display = 'none';
        } else {
            modalImagenElem.style.display = 'block';
            modalImagenElem.src = noticia.imagen || imgFallback;
            if (videoContainerModal) videoContainerModal.textContent = '';
        }
    }

    const modal = document.getElementById('modal-noticia');
    if (modal) modal.style.display = 'flex';

    const nuevaURL = `${window.location.pathname}?id=${noticia.id}`;
    window.history.pushState({ path: nuevaURL }, '', nuevaURL);
}

function cerrarNoticia() {
    const modal = document.getElementById('modal-noticia');
    if (modal) modal.style.display = 'none';
    window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
}

// -------------------------------------------------------------
// 3. FACEBOOK Y MINUTO 1
// -------------------------------------------------------------
async function cargarDatosSecundarios() {
    try {
        const ts = new Date().getTime();
        const response = await fetch(`${urlAppsScriptMinutoUno}?_t=${ts}`);
        const data = await response.json();
        
        // Si el backend es el antiguo, devuelve un array
        if (Array.isArray(data)) {
            renderizarMinutoUno(data);
        } else {
            // Backend nuevo: devuelve un objeto { noticias, facebook, publicidades }
            if (data.noticias || data.minuto1) {
                renderizarMinutoUno(data.noticias || data.minuto1);
            }
            if (data.publicidades) {
                renderizarPublicidades(data.publicidades);
            }
        }
    } catch (err) {
        console.error("Error al cargar datos secundarios (Minuto 1 / Publicidades):", err);
    }

    // 2. Cargar Facebook desde Supabase
    cargarFacebookDesdeSupabase();
}

async function cargarFacebookDesdeSupabase() {
    // REEMPLAZAR AQUÍ CON TU URL Y ANON KEY DE SUPABASE
    const SUPABASE_URL = 'https://ugbwqusesrygfhkckncr.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_ryxtditdrjjRaHijZwc2Zw_07i9H8Ar'; // Clave pública

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/fb_posts?page_url=eq.https://www.facebook.com/hits20radio/&order=fecha_publicacion.desc&limit=3`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error de red: ${response.status}`);
        }

        const fbPosts = await response.json();

        if (fbPosts && fbPosts.length > 0) {
            const postsFormateados = fbPosts.map(f => ({
                titulo:            f.titulo || 'Publicación de Facebook',
                enlace:            f.media_url || f.post_id || '#',
                fecha_publicacion: f.fecha_publicacion || '',
                imagen:            f.media_url || imgFallback,
                cuerpo:            f.cuerpo || '',
                media_type:        f.media_type || 'image',
            }));
            renderizarFacebook(postsFormateados);
        } else {
            console.log("No se encontraron publicaciones de Facebook en Supabase.");
        }
    } catch (err) {
        console.error("Error al cargar Facebook desde Supabase:", err);
    }
}


function renderizarMinutoUno(data) {
    const contenedor = document.getElementById('grid-minutouno');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!data || data.length === 0) {
        const msg = document.createElement('p');
        msg.style.cssText = 'color: #666; font-size: 0.9rem;';
        msg.textContent = 'No hay noticias disponibles en este momento.';
        contenedor.appendChild(msg);
        return;
    }

    // Filtrar y omitir encabezados si vienen mezclados
    const noticiasFiltradas = data.filter(noticia => {
        const tituloNoticia = (noticia.titulo || noticia.Noticia || '').toLowerCase().trim();
        if (tituloNoticia === '' || tituloNoticia === 'noticia' || tituloNoticia === 'titulo') return false;
        return !tituloNoticia.includes("minuto 1") && !tituloNoticia.includes("minuto uno");
    }).slice(0, 6);

    noticiasFiltradas.forEach(noticia => {
        const card = document.createElement('article');
        card.className = 'card-noticia';
        card.style.cursor = 'pointer';

        const titulo = noticia.titulo || noticia.Noticia || 'Sin título';
        const imagen = noticia.imagen || noticia.Imagen || imgFallback;
        const enlace = noticia.enlace || noticia.Enlace || '#';
        const categoria = noticia.seccion || noticia.categoria || 'Minuto 1';
        const cuerpoText = noticia.cuerpo || noticia.descripcion || noticia.Descripcion || '';

        const imageBox = document.createElement('div');
        imageBox.className = 'card-image-box';
        const img = document.createElement('img');
        img.src = imagen;
        img.alt = titulo;
        img.loading = 'lazy';
        img.addEventListener('error', function () { this.src = imgFallback; });
        imageBox.appendChild(img);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.cssText = 'background: #d9534f; color: #fff;';
        badge.textContent = categoria;

        const h3 = document.createElement('h3');
        h3.style.cssText = 'font-weight: 600; font-size: 0.9rem; margin-top: 6px;';
        h3.textContent = titulo;

        const link = document.createElement('a');
        link.href = enlace;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'btn-read-more';
        link.style.cssText = 'display: inline-block; margin-top: 10px; text-decoration: none; font-size: 0.85rem; font-weight: bold; color: #d9534f;';
        link.textContent = 'Leer más ↗';
        link.addEventListener('click', e => e.stopPropagation());

        cardBody.appendChild(badge);
        cardBody.appendChild(h3);
        cardBody.appendChild(link);

        card.appendChild(imageBox);
        card.appendChild(cardBody);

        card.addEventListener('click', () => {
            abrirMinutoUnoModal({ categoria, titulo, imagen, cuerpo: cuerpoText, enlace });
        });

        contenedor.appendChild(card);
    });
}

function renderizarFacebook(data) {
    const contenedor = document.getElementById('grid-facebook');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!data || data.length === 0) {
        const msg = document.createElement('p');
        msg.style.cssText = 'color: #666; font-size: 0.9rem;';
        msg.textContent = 'No hay publicaciones recientes de Facebook.';
        contenedor.appendChild(msg);
        return;
    }

    const items = data.slice(0, 3);
    items.forEach(item => {
        const titulo    = item.titulo || item.Titulo || "Publicación de Facebook";
        const cuerpo    = item.cuerpo || item.descripcion || "";
        const pubDate   = item.fecha_publicacion || item.fecha || item.Fecha || "";
        const imagenUrl = item.media_url || item.imagen || item.Imagen || imgFallback;
        const videoUrl  = item.video_url || "";   // URL del video en Supabase Storage
        const mediaType = item.media_type || 'image';
        // Enlace externo a Facebook (solo como fallback)
        const enlace    = item.post_id ? `https://facebook.com/${item.post_id}` : (item.enlace || item.Enlace || "#");

        const card = document.createElement('article');
        card.className = 'card-noticia';
        card.style.cursor = 'pointer';

        const imageBox = document.createElement('div');
        imageBox.className = 'card-image-box';
        
        // Si es video, mostrar play-icon sobre el thumbnail
        if (mediaType === 'video' && videoUrl) {
            imageBox.style.position = 'relative';
            const playIcon = document.createElement('div');
            playIcon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;background:rgba(0,0,0,0.6);border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:2;pointer-events:none;';
            playIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>';
            imageBox.appendChild(playIcon);
        }
        
        const img = document.createElement('img');
        img.src = imagenUrl;
        img.alt = titulo;
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        img.addEventListener('error', function () { this.src = imgFallback; });
        imageBox.appendChild(img);

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.style.cssText = 'background: #1877f2; color: #fff;';
        badge.textContent = mediaType === 'video' ? '▶ Facebook Video' : 'Facebook';

        const h3 = document.createElement('h3');
        h3.textContent = cuerpo ? cuerpo.substring(0, 80) + (cuerpo.length > 80 ? '...' : '') : titulo;

        cardBody.appendChild(badge);
        if (pubDate) {
            const dateSpan = document.createElement('span');
            dateSpan.style.cssText = 'font-size: 0.75rem; color: #777; display: block; margin-top: 5px;';
            dateSpan.textContent = formatearFechaYHora(pubDate);
            cardBody.appendChild(dateSpan);
        }
        cardBody.appendChild(h3);

        card.appendChild(imageBox);
        card.appendChild(cardBody);

        // Al hacer click → abrir modal con video o imagen nativa
        card.addEventListener('click', () => {
            abrirFacebookModal(titulo, cuerpo, imagenUrl, videoUrl, enlace, mediaType);
        });

        contenedor.appendChild(card);
    });
}

function abrirFacebookModal(titulo, cuerpo, imagenUrl, videoUrl, enlaceFb, mediaType = 'image') {
    const existing = document.getElementById('fb-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'fb-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:999999;padding:16px;box-sizing:border-box;';

    const modal = document.createElement('div');
    modal.style.cssText = [
        'background:#111',
        'width:95%',
        'max-width:680px',
        'max-height:90vh',
        'border-radius:16px',
        'overflow:hidden',
        'overflow-y:auto',
        'position:relative',
        'box-shadow:0 24px 64px rgba(0,0,0,0.8)',
        'display:flex',
        'flex-direction:column'
    ].join(';');

    // ── Zona de media ──
    const mediaZone = document.createElement('div');
    mediaZone.style.cssText = 'width:100%;background:#000;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center;';

    // Función auxiliar para renderizar el iframe alternativo si el video falla
    const renderIframeFbAlternativo = () => {
        mediaZone.innerHTML = '';
        
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(enlaceFb)}&show_text=false&width=auto`;
        iframe.style.cssText = 'width:100%; height:400px; border:none; overflow:hidden; background:#000;';
        iframe.scrolling = "no";
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        iframe.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share";
        
        mediaZone.appendChild(iframe);
        
        // Botón superpuesto "Ver Video Original"
        const btnVerEnFb = document.createElement('a');
        btnVerEnFb.href = enlaceFb;
        btnVerEnFb.target = '_blank';
        btnVerEnFb.rel = 'noopener noreferrer';
        btnVerEnFb.textContent = 'Ver Video Original ↗';
        btnVerEnFb.style.cssText = 'position:absolute; bottom:15px; right:15px; background:rgba(24,119,242,0.9); color:#fff; padding:8px 14px; border-radius:6px; font-size:0.85rem; font-weight:bold; text-decoration:none; z-index:10; box-shadow:0 2px 5px rgba(0,0,0,0.3);';
        mediaZone.appendChild(btnVerEnFb);
    };

    if (videoUrl && videoUrl.includes('supabase.co')) {
        // Video nativo alojado exitosamente en tu Supabase
        const video = document.createElement('video');
        video.src = videoUrl;
        video.controls = true;
        video.autoplay = false;
        video.style.cssText = 'width:100%;max-height:420px;display:block;background:#000;';
        video.poster = imagenUrl || '';
        
        // Si el video de Supabase falla al cargar (raro, pero posible), mostramos el fallback
        video.onerror = renderIframeFbAlternativo;
        
        mediaZone.appendChild(video);
    } else if (videoUrl || mediaType === 'video') {
        // Es un video pero la URL es externa (CDN de FB caducable) o no vino la URL del video. 
        // Renderizamos directamente el fallback para evitar la imagen estática.
        renderIframeFbAlternativo();
    } else {
        // Imagen (siempre mostrar, incluso si es fallback)
        const imgEl = document.createElement('img');
        imgEl.src = imagenUrl || imgFallback;
        imgEl.alt = titulo;
        imgEl.style.cssText = 'width:100%;max-height:400px;object-fit:cover;display:block;';
        imgEl.addEventListener('error', function() { this.src = imgFallback; });
        mediaZone.appendChild(imgEl);
    }

    // ── Contenido textual ──
    const content = document.createElement('div');
    content.style.cssText = 'padding:20px 22px 24px;background:#1a1a1a;color:#f0f0f0;flex:1;';

    const badge = document.createElement('span');
    badge.style.cssText = 'display:inline-block;background:#1877f2;color:#fff;padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;margin-bottom:12px;';
    badge.textContent = (mediaType === 'video') ? '▶ Video de Facebook' : '📘 Facebook';

    // Texto completo de la publicación sin truncar
    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:0.95rem;color:#e0e0e0;line-height:1.7;margin:0;white-space:pre-wrap;word-break:break-word;';
    desc.textContent = cuerpo || titulo;

    content.appendChild(badge);
    content.appendChild(desc);

    // Botón cerrar
    const btnClose = document.createElement('button');
    btnClose.textContent = '✕';
    btnClose.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;z-index:10;line-height:1;';
    btnClose.addEventListener('click', () => overlay.remove());

    modal.appendChild(mediaZone);
    modal.appendChild(content);
    modal.appendChild(btnClose);
    overlay.appendChild(modal);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
}


function renderizarPublicidades(publicidades) {
    const contenedor = document.getElementById('ads-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    const MAX_SLOTS = 5;
    const lista = (publicidades || []).slice(0, MAX_SLOTS);

    for (let i = 0; i < MAX_SLOTS; i++) {
        const pub = lista[i];

        const adWrapper = document.createElement('div');
        adWrapper.style.cssText = 'background: #fff; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 15px; text-align: center;';

        if (!pub) {
            // Slot vacío - placeholder visual
            adWrapper.style.cssText += 'border: 2px dashed #ddd; color: #aaa; min-height: 80px; display: flex; align-items: center; justify-content: center;';
            const placeholder = document.createElement('p');
            placeholder.style.cssText = 'margin: 0; font-size: 0.85rem;';
            placeholder.textContent = `Espacio Publicitario / Flyer ${i + 1}`;
            adWrapper.appendChild(placeholder);
            contenedor.appendChild(adWrapper);
            continue;
        }

        // Slot con publicidad real
        const img = document.createElement('img');
        img.src = pub.imagen || pub.Imagen || imgFallback;
        img.alt = pub.titulo || pub.Titulo || 'Publicidad';
        img.style.cssText = 'width: 100%; border-radius: 6px; object-fit: contain; max-height: 250px;';
        img.addEventListener('error', function () { this.src = imgFallback; });
        adWrapper.appendChild(img);
        
        const textWrapper = document.createElement('div');
        textWrapper.style.marginTop = '10px';

        const titulo = pub.titulo || pub.Titulo;
        if (titulo) {
            const h4 = document.createElement('h4');
            h4.style.cssText = 'margin: 5px 0; color: #333; font-size: 1rem;';
            h4.textContent = titulo;
            textWrapper.appendChild(h4);
        }

        const texto = pub.texto || pub.Texto;
        if (texto) {
            const p = document.createElement('p');
            p.style.cssText = 'font-size: 0.85rem; color: #555; margin: 5px 0;';
            p.textContent = texto;
            textWrapper.appendChild(p);
        }

        const email = pub.email || pub.Email;
        const telefono = pub.telefono || pub.Telefono;
        if (telefono || email) {
            const contactDiv = document.createElement('div');
            contactDiv.style.cssText = 'font-size: 0.8rem; color: #777; margin-top: 5px;';
            if (telefono) {
                const telSpan = document.createElement('span');
                telSpan.textContent = `📞 ${telefono} `;
                contactDiv.appendChild(telSpan);
            }
            if (email) {
                const emailSpan = document.createElement('span');
                emailSpan.textContent = `✉️ ${email}`;
                contactDiv.appendChild(emailSpan);
            }
            textWrapper.appendChild(contactDiv);
        }

        const url = pub.url || pub.Url;
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.cssText = 'display: inline-block; margin-top: 10px; padding: 5px 10px; background: #d9534f; color: #fff; text-decoration: none; border-radius: 4px; font-size: 0.85rem; font-weight: bold;';
            link.textContent = 'Visitar Web';
            textWrapper.appendChild(link);
        }

        adWrapper.appendChild(textWrapper);
        contenedor.appendChild(adWrapper);
    }
}

// Función para mostrar la noticia de Minuto 1 dentro del Modal Emergente
function abrirMinutoUnoModal(noticia) {
    const elCategoria = document.getElementById('modal-categoria');
    const elTitulo = document.getElementById('modal-titulo');
    const elCuerpo = document.getElementById('modal-cuerpo');
    const elFecha = document.getElementById('modal-fecha');
    const modalImagenElem = document.getElementById('modal-imagen');

    // SEC-003: usar textContent para datos externos
    if (elCategoria) elCategoria.textContent = noticia.categoria;
    if (elTitulo) elTitulo.textContent = noticia.titulo;
    if (elFecha) elFecha.textContent = '';
    
    // Si existe el reproductor de video de otras notas, lo limpia
    const videoContainerModal = document.getElementById('modal-video-container');
    if (videoContainerModal) videoContainerModal.textContent = '';

    if (elCuerpo) {
        elCuerpo.textContent = noticia.cuerpo ? `${noticia.cuerpo}\n\n` : '';
        
        // Creamos o actualizamos el botón para ir al portal original
        let btnExterno = document.getElementById('btn-modal-externo');
        if (!btnExterno) {
            btnExterno = document.createElement('a');
            btnExterno.id = 'btn-modal-externo';
            btnExterno.target = '_blank';
            // SEC-015: rel en enlace externo
            btnExterno.rel = 'noopener noreferrer';
            btnExterno.style.cssText = 'display: inline-block; margin-top: 15px; background: #d9534f; color: #fff; padding: 10px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 0.9rem;';
            elCuerpo.appendChild(btnExterno);
        }
        btnExterno.style.display = 'inline-block';
        btnExterno.href = noticia.enlace;
        btnExterno.textContent = 'Ir a ver al portal original ↗';
    }

    if (modalImagenElem) {
        modalImagenElem.style.display = 'block';
        modalImagenElem.src = noticia.imagen;
    }

    const modal = document.getElementById('modal-noticia');
    if (modal) modal.style.display = 'flex';
}

// -------------------------------------------------------------
// 4. AUXILIARES, BÚSQUEDA Y REPRODUCTOR
// -------------------------------------------------------------
function formatearFechaYHora(fechaCruda, horaCruda) {
    if (!fechaCruda) return '';
    const fechaStr = String(fechaCruda).trim();
    const fechaLimpia = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr.substring(0, 10);
    let fuenteHora = horaCruda;
    if ((!fuenteHora || String(fuenteHora).trim() === '' || String(fuenteHora).trim() === 'null') && fechaStr.includes('T')) {
        fuenteHora = fechaStr.split('T')[1];
    }
    let horaFinal = '';
    if (fuenteHora && String(fuenteHora).trim() !== 'null') {
        const match = String(fuenteHora).match(/\d{2}:\d{2}/);
        horaFinal = match ? match[0] : String(fuenteHora).trim();
    }
    return horaFinal ? `${fechaLimpia} - ${horaFinal}` : fechaLimpia;
}

function filterNews() {
    const searchInputEl = document.getElementById('searchInput');
    if (!searchInputEl) return;
    const input = searchInputEl.value.toLowerCase().trim();
    if (input === "") {
        renderizarNoticiasAppsScript(todasLasNoticias);
        return;
    }
    const resultados = todasLasNoticias.filter(noticia => 
        (noticia.titulo && noticia.titulo.toLowerCase().includes(input)) || 
        (noticia.descripcion && noticia.descripcion.toLowerCase().includes(input)) ||
        (noticia.cuerpo && noticia.cuerpo.toLowerCase().includes(input))
    );
    renderizarNoticiasAppsScript(resultados);
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

function inicializarArrastrePlayer() {
    const player = document.getElementById('radio-modal-flotante');
    const header = document.getElementById('radio-header-drag');
    if (!player || !header) return;

    let isDragging = false, startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('player-widget__close')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = player.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        player.style.left = initialX + 'px';
        player.style.top = initialY + 'px';
        player.style.bottom = 'auto';
        player.style.right = 'auto';

        const onMouseMove = (ev) => {
            if (!isDragging) return;
            const newX = initialX + (ev.clientX - startX);
            const newY = initialY + (ev.clientY - startY);
            player.style.left = Math.max(0, Math.min(newX, window.innerWidth - player.offsetWidth)) + 'px';
            player.style.top = Math.max(0, Math.min(newY, window.innerHeight - player.offsetHeight)) + 'px';
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// -------------------------------------------------------------
// 5. MODAL DE ADMINISTRACIÓN DE PUBLICIDADES (ADS)
// -------------------------------------------------------------
function inicializarAdminAds() {
    const btnAdminAds = document.getElementById('btn-admin-ads');

    if (btnAdminAds) {
        btnAdminAds.addEventListener('click', () => {
            if (sessionStorage.getItem("auth") === "true") {
                window.open("admin_ads.html", "AdminAds", "width=900,height=650,left=100,top=100,resizable=yes,scrollbars=yes");
            } else {
                const user = prompt("Ingrese el usuario administrador:");
                if (user === null) return;
                const pass = prompt("Ingrese la contraseña:");
                if (pass === null) return;
                
                if (user === "admin" && pass === "radio2026") {
                    sessionStorage.setItem("auth", "true");
                    window.open("admin_ads.html", "AdminAds", "width=900,height=650,left=100,top=100,resizable=yes,scrollbars=yes");
                } else {
                    alert("Credenciales incorrectas.");
                }
            }
        });
    }
}
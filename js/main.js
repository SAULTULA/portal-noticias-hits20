// URLs de ejecutables de Google Apps Script
const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";
// URL corregida de Minuto 1 (sin caracteres extra al final)
const urlAppsScriptMinutoUno = "https://script.google.com/macros/s/AKfycbzR7SwIz2RhDD5XS9Cu15qMz7jvimJBIIQ-VBG3kcIOlInJlDxw2T-jpnpkC65kAAng/exec";

// Feed RSS de Facebook
const urlRssFacebook = "https://rss.app/feeds/a0CU7nQs9g8nXGIV.xml";
const imgFallback = "logo.png";

let todasLasNoticias = [];

document.addEventListener("DOMContentLoaded", function () {
    // 1. Carga de Noticias de Apps Script (Provinciales, Nacionales, Internacionales)
    cargarNoticiasAppsScript();

    // 2. Carga de Facebook y Minuto 1
    cargarNoticiasFacebook();
    cargarNoticiasMinutoUno();

    // 3. Reproductor
    const audio = document.getElementById('audio-stream');
    if (audio) {
        audio.volume = 0.4;
    }

    inicializarArrastrePlayer();
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
    const terminoBusqueda = document.getElementById('searchInput') ? document.getElementById('searchInput').value.trim() : '';

    let listaOrdenada = [...listaParaPintar].sort((a, b) => {
        let fechaA = new Date(a.fecha || a.Fecha).getTime() || 0;
        let fechaB = new Date(b.fecha || b.Fecha).getTime() || 0;
        if (fechaB !== fechaA) return fechaB - fechaA;
        let horaA = a.hora || a.Hora || "00:00";
        let horaB = b.hora || b.Hora || "00:00";
        return horaB.localeCompare(horaA);
    });

    listaOrdenada.forEach(noticia => {
        const categoria = (noticia.categoria || '').toLowerCase().trim();
        let contenedor = null;

        if (categoria.includes('internacional')) contenedor = internacionales;
        else if (categoria.includes('nacional')) contenedor = nacionales;
        else if (categoria.includes('provincial')) contenedor = provinciales;

        if (contenedor) {
            let fechaCruda = noticia.fecha || noticia.Fecha;
            let fechaNoticia = new Date(fechaCruda || 0);
            
            // Si tiene más de 72 horas y no hay búsqueda activa, se descarta
            let esMasDe72Horas = (ahora.getTime() - fechaNoticia.getTime()) > limite72Horas;
            if (esMasDe72Horas && !terminoBusqueda) return;

            const card = document.createElement('article');
            card.className = 'card-noticia';
            card.style.cursor = 'pointer';

            let fechaTexto = formatearFechaYHora(fechaCruda, noticia.hora || noticia.Hora);
            let contenidoMultimediaHtml = obtenerHtmlMultimedia(noticia.video || noticia.Video, noticia.imagen || noticia.Imagen);

            card.innerHTML = `
                <div class="card-image-box" style="width: 100%; height: 160px; overflow: hidden; background: #000;">
                    ${contenidoMultimediaHtml}
                </div>
                <div class="card-body" style="padding: 12px;">
                    <span class="badge" style="background: #d9534f; color: #fff;">${noticia.categoria || 'Noticia'}</span>
                    <div style="font-size: 0.75rem; color: #777; margin-top: 4px;">${fechaTexto}</div>
                    <h3 style="font-weight: 600; font-size: 0.9rem; margin-top: 6px;">${noticia.titulo || 'Sin título'}</h3>
                    <p style="font-size: 0.8rem; color: #555; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${noticia.descripcion || ''}</p>
                </div>
            `;

            card.addEventListener('click', () => abrirNoticiaModal(noticia));
            contenedor.appendChild(card);
        }
    });
}

function obtenerHtmlMultimedia(urlVideo, urlImagen) {
    if (urlVideo && urlVideo.trim() !== "") {
        let videoUrl = urlVideo.trim();
        if (videoUrl.includes("youtube.com/watch?v=")) {
            let videoId = videoUrl.split("v=")[1]?.split("&")[0];
            if (videoId) return `<iframe src="https://www.youtube.com/embed/${videoId}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>`;
        } else if (videoUrl.includes("youtu.be/")) {
            let videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
            if (videoId) return `<iframe src="https://www.youtube.com/embed/${videoId}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>`;
        }
        return `<video src="${videoUrl}" controls style="width: 100%; height: 100%; object-fit: cover; background: #000;"></video>`;
    }
    return `<img src="${urlImagen || imgFallback}" alt="Imagen noticia" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='${imgFallback}'">`;
}

// -------------------------------------------------------------
// 2. MODAL DE NOTICIAS
// -------------------------------------------------------------
function abrirNoticiaModal(noticia) {
    const elCategoria = document.getElementById('modal-categoria');
    const elTitulo = document.getElementById('modal-titulo');
    const elCuerpo = document.getElementById('modal-cuerpo');
    const elFecha = document.getElementById('modal-fecha');
    const modalImagenElem = document.getElementById('modal-imagen');

    if (elCategoria) elCategoria.innerText = noticia.categoria || '';
    if (elTitulo) elTitulo.innerText = noticia.titulo || '';
    if (elCuerpo) elCuerpo.innerText = noticia.cuerpo || noticia.descripcion || '';
    if (elFecha) elFecha.innerText = formatearFechaYHora(noticia.fecha || noticia.Fecha, noticia.hora || noticia.Hora);

    if (modalImagenElem) {
        let parentModalImg = modalImagenElem.parentNode;
        let videoContainerModal = document.getElementById('modal-video-container');

        if (noticia.video && noticia.video.trim() !== "") {
            let multimediaModalHtml = obtenerHtmlMultimedia(noticia.video, noticia.imagen);
            if (!videoContainerModal) {
                videoContainerModal = document.createElement('div');
                videoContainerModal.id = 'modal-video-container';
                videoContainerModal.style.width = '100%';
                videoContainerModal.style.height = '300px';
                videoContainerModal.style.background = '#000';
                videoContainerModal.style.marginBottom = '15px';
                parentModalImg.insertBefore(videoContainerModal, modalImagenElem);
            }
            videoContainerModal.innerHTML = multimediaModalHtml;
            modalImagenElem.style.display = 'none';
        } else {
            modalImagenElem.style.display = 'block';
            modalImagenElem.src = noticia.imagen || imgFallback;
            if (videoContainerModal) videoContainerModal.innerHTML = '';
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
async function cargarNoticiasFacebook() {
    const contenedor = document.getElementById('grid-facebook');
    if (!contenedor) return;

    try {
        const response = await fetch(urlRssFacebook);
        const strText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(strText, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 3);

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
                if (imgMatch && imgMatch[1]) imagenUrl = imgMatch[1];
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

        // Se saltan las primeras 2 filas (índices 0 y 1 del Sheet)
        // Y filtra cualquier item cuyo título contenga "minuto 1" o "minuto uno"
        const noticiasFiltradas = data.slice(2).filter(noticia => {
            const tituloNoticia = (noticia.titulo || noticia.Noticia || '').toLowerCase().trim();
            return !tituloNoticia.includes("minuto 1") && !tituloNoticia.includes("minuto uno");
        }).slice(0, 6);

        noticiasFiltradas.forEach(noticia => {
            const card = document.createElement('article');
            card.className = 'card-noticia';
            card.innerHTML = `
                <div class="card-image-box">
                    <img src="${noticia.imagen || noticia.Imagen || imgFallback}" alt="${noticia.titulo || noticia.Noticia || 'Noticia'}" onerror="this.src='${imgFallback}'">
                </div>
                <div class="card-body">
                    <span class="badge" style="background: #d9534f; color: #fff;">${noticia.seccion || noticia.categoria || 'Minuto 1'}</span>
                    <h3 style="font-weight: 600; font-size: 0.9rem; margin-top: 6px;">${noticia.titulo || noticia.Noticia || 'Sin título'}</h3>
                    <a href="${noticia.enlace || noticia.Enlace || '#'}" target="_blank" rel="noopener noreferrer" class="btn-read-more" style="display: inline-block; margin-top: 10px; text-decoration: none; font-size: 0.85rem; font-weight: bold; color: #d9534f;">
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
// 4. AUXILIARES, BÚSQUEDA Y REPRODUCTOR
// -------------------------------------------------------------
function formatearFechaYHora(fechaCruda, horaCruda) {
    if (!fechaCruda) return '';
    let fechaStr = String(fechaCruda).trim();
    let fechaLimpia = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr.substring(0, 10);
    let fuenteHora = horaCruda;
    if ((!fuenteHora || String(fuenteHora).trim() === '' || String(fuenteHora).trim() === 'null') && fechaStr.includes('T')) {
        fuenteHora = fechaStr.split('T')[1];
    }
    let horaFinal = '';
    if (fuenteHora && String(fuenteHora).trim() !== 'null') {
        let match = String(fuenteHora).match(/\d{2}:\d{2}/);
        horaFinal = match ? match[0] : String(fuenteHora).trim();
    }
    return horaFinal ? `${fechaLimpia} - ${horaFinal}` : fechaLimpia;
}

function filterNews() {
    const input = document.getElementById('searchInput').value.toLowerCase().trim();
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
        if (e.target.classList.contains('radio-flotante-close')) return;
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
            let newX = initialX + (ev.clientX - startX);
            let newY = initialY + (ev.clientY - startY);
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

// URL de tu API del Portal
const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";

// URL del script para Minuto 1
const urlMinutoUno = "https://script.google.com/macros/s/AKfycbzR7SwIz2RhDD5XS9Cu15qMz7jvimJBIIQ-VBG3kcIOlInJlDxw2T-jpnpkC65kAAng/exec";

// Imagen SVG por defecto en caso de no existir imagen
const imgFallback = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMTgwIiB2aWV3Qm94PSIwIDAgMzAwIDE4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2NjY2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjNjY2NjY2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNpbiBJbWFnZW48L3RleHQ+PC9zdmc+";

let todasLasNoticias = [];

document.addEventListener("DOMContentLoaded", function () {
    cargarNoticiasPortal();
    cargarNoticiasMinutoUno();

    const audio = document.getElementById('audio-stream');
    if (audio) {
        audio.volume = 0.4;
    }
});

// -------------------------------------------------------------
// DETECCIÓN Y EXTRACCIÓN DE MULTIMEDIA / MINIATURAS
// -------------------------------------------------------------
function obtenerUrlMultimedia(rawMultimedia) {
    if (!rawMultimedia || typeof rawMultimedia !== 'string') return { url: imgFallback, esVideo: false, videoId: null };

    let urlTrim = rawMultimedia.trim();

    // Detección de enlaces de YouTube / Shorts
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlTrim.match(regExp);

    if (match && match[2].length === 11) {
        const videoId = match[2];
        return {
            url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            esVideo: true,
            videoId: videoId
        };
    }

    return { url: urlTrim, esVideo: false, videoId: null };
}

// -------------------------------------------------------------
// FILTRO DE NOTICIAS DE MÁS DE 2 DÍAS (48 HORAS)
// -------------------------------------------------------------
function esNoticiaReciente(fechaRaw) {
    if (!fechaRaw) return true;
    try {
        const fechaNoticia = new Date(fechaRaw);
        if (isNaN(fechaNoticia.getTime())) return true;
        
        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaNoticia) / (1000 * 60 * 60);
        return diferenciaHoras <= 48;
    } catch (e) {
        return true;
    }
}

// -------------------------------------------------------------
// 1. CARGA DE NOTICIAS PROPIAS DEL PORTAL
// -------------------------------------------------------------
function cargarNoticiasPortal() {
    fetch(urlAPI)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) return;
            
            todasLasNoticias = data.filter(n => esNoticiaReciente(n.fecha || n.Fecha || n["Fecha"]));
            renderizarNoticias(todasLasNoticias);

            const urlParams = new URLSearchParams(window.location.search);
            const idNoticiaParam = urlParams.get('id');
            if (idNoticiaParam) {
                const noticiaEncontrada = todasLasNoticias.find(n => String(n.id) === String(idNoticiaParam));
                if (noticiaEncontrada) {
                    abrirModalNoticia(noticiaEncontrada);
                }
            }
        })
        .catch(err => console.error("Error al cargar noticias del portal:", err));
}

function renderizarNoticias(noticias) {
    const gridProvinciales = document.getElementById('grid-provinciales');
    const gridNacionales = document.getElementById('grid-nacionales');
    const gridInternacionales = document.getElementById('grid-internacionales');

    if (gridProvinciales) gridProvinciales.innerHTML = '';
    if (gridNacionales) gridNacionales.innerHTML = '';
    if (gridInternacionales) gridInternacionales.innerHTML = '';

    noticias.forEach(noticia => {
        const cat = (noticia.categoria || '').trim().toLowerCase();
        const card = document.createElement('article');
        card.className = 'card-noticia';
        card.onclick = () => abrirModalNoticia(noticia);

        let fechaHoraTexto = formatearFechaYHora(noticia.fecha || noticia.Fecha || noticia["Fecha"], noticia.hora || noticia.Hora);
        let rawMultimedia = noticia["Imagen/Multimedia"] || noticia.imagen || noticia.Imagen;
        const multimediaInfo = obtenerUrlMultimedia(rawMultimedia);
        const tituloTexto = noticia["Título"] || noticia.titulo || 'Sin título';

        card.innerHTML = `
            <div style="position: relative; width: 100%; height: 160px; overflow: hidden; background: #222;">
                <img src="${multimediaInfo.url}" alt="${tituloTexto}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${imgFallback}'">
                ${multimediaInfo.esVideo ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                        <div style="width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 14px solid #fff; margin-left: 3px;"></div>
                    </div>
                ` : ''}
            </div>
            <div class="card-content">
                <span class="badge">${noticia.categoria || 'General'}</span>
                <span style="font-size: 0.7rem; color: #777; display: block; margin-top: 4px;">${fechaHoraTexto}</span>
                <h3>${tituloTexto}</h3>
            </div>
        `;

        if (cat === 'provincial' && gridProvinciales) gridProvinciales.appendChild(card);
        else if (cat === 'nacional' && gridNacionales) gridNacionales.appendChild(card);
        else if (cat === 'internacional' && gridInternacionales) gridInternacionales.appendChild(card);
    });
}

// -------------------------------------------------------------
// 2. CARGA DE NOTICIAS DE MINUTO 1 (CON PREVIA Y MODAL)
// -------------------------------------------------------------
async function cargarNoticiasMinutoUno() {
    const contenedor = document.getElementById('grid-minutouno');
    if (!contenedor) return;

    try {
        const res = await fetch(urlMinutoUno);
        const noticias = await res.json();

        contenedor.innerHTML = '';

        let noticiasValidas = Array.isArray(noticias) ? noticias : [];
        noticiasValidas = noticiasValidas.filter(noti => esNoticiaReciente(noti["Fecha"] || noti.fecha || noti.Fecha));

        const noticiasMostradas = noticiasValidas.slice(0, 3);

        if (noticiasMostradas.length === 0) {
            contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay noticias recientes de Minuto 1 en las últimas 48 horas.</p>';
            return;
        }

        noticiasMostradas.forEach(noti => {
            const card = document.createElement('article');
            card.className = 'card-noticia';
            card.style.background = '#fff';
            card.style.borderRadius = '8px';
            card.style.overflow = 'hidden';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            card.style.cursor = 'pointer';

            let rawMultimedia = noti["Imagen/Multimedia"] || noti.imagen || noti.image || noti.urlImagen;
            const multimediaInfo = obtenerUrlMultimedia(rawMultimedia);
            
            const tituloTexto = noti["Título"] || noti.titulo || noti.title || 'Sin título';
            const enlaceUrl = noti["Enlace"] || noti.enlace || noti.link || noti.url || '#';
            const fechaVal = noti["Fecha"] || noti.fecha || noti.Fecha;
            
            let fechaHoraTexto = formatearFechaYHora(fechaVal, noti.hora || noti.Hora);

            // Estructura de tarjeta con imagen previa clara
            card.innerHTML = `
                <div>
                    <div style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #111;">
                        <img src="${multimediaInfo.url}" alt="${tituloTexto}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${imgFallback}'">
                        ${multimediaInfo.esVideo ? `
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.75); border-radius: 50%; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                                <div style="width: 0; height: 0; border-top: 9px solid transparent; border-bottom: 9px solid transparent; border-left: 15px solid #fff; margin-left: 3px;"></div>
                            </div>
                            <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(230, 57, 70, 0.9); color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; font-weight: bold;">VIDEO</span>
                        ` : ''}
                    </div>
                    <div style="padding: 15px;">
                        <span class="badge" style="background: #e63946; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Minuto 1</span>
                        <span style="font-size: 0.75rem; color: #777; display: block; margin-top: 6px;">${fechaHoraTexto}</span>
                        <h3 style="font-size: 1rem; margin: 8px 0 0 0; color: #1a1a1a; line-height: 1.4;">${tituloTexto}</h3>
                    </div>
                </div>
                <div style="padding: 15px;">
                    <button type="button" class="btn-leer-mas" style="width: 100%; border: none; background: #d9534f; color: #fff; padding: 9px 12px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">
                        Ver noticia →
                    </button>
                </div>
            `;

            // Al hacer clic en la tarjeta de Minuto 1 se abre el Modal de la web
            card.onclick = () => {
                abrirModalNoticia({
                    categoria: 'Minuto 1',
                    titulo: tituloTexto,
                    imagen: rawMultimedia,
                    enlace: enlaceUrl,
                    cuerpo: 'Haz clic en el enlace adjunto para ir a la noticia o fuente original.',
                    fecha: fechaVal,
                    hora: noti.hora || noti.Hora
                });
            };

            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar Minuto 1:", err);
        contenedor.innerHTML = '<p style="color: #666;">No se pudieron cargar las noticias de Minuto 1.</p>';
    }
}

// -------------------------------------------------------------
// 3. VENTANA EMERGENTE (MODAL DENTRO DE LA WEB)
// -------------------------------------------------------------
function abrirModalNoticia(noticia) {
    const modal = document.getElementById('modal-noticia');
    if (!modal) return;

    document.getElementById('modal-categoria').innerText = noticia.categoria || 'Noticias';
    document.getElementById('modal-titulo').innerText = noticia.titulo || noticia["Título"] || 'Sin título';
    
    let rawMultimedia = noticia.imagen || noticia["Imagen/Multimedia"];
    let multimediaInfo = obtenerUrlMultimedia(rawMultimedia);
    let imgModal = document.getElementById('modal-imagen');

    if (imgModal) {
        imgModal.src = multimediaInfo.url;
        imgModal.onerror = function() { this.src = imgFallback; };
    }

    // Cuerpo / Detalle
    let cuerpoModal = document.getElementById('modal-cuerpo');
    if (cuerpoModal) {
        let textoCuerpo = noticia.cuerpo || noticia.descripcion || '';
        let enlaceUrl = noticia.enlace || noticia.Enlace || '#';

        if (enlaceUrl !== '#') {
            textoCuerpo += `<br><br><a href="${enlaceUrl}" target="_blank" style="display: inline-block; background: #007bff; color: #fff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-top: 10px;">Abrir nota original en fuente externa ↗</a>`;
        }
        cuerpoModal.innerHTML = textoCuerpo;
    }

    let fechaHoraTexto = formatearFechaYHora(noticia.fecha || noticia.Fecha || noticia["Fecha"], noticia.hora || noticia.Hora);
    let fechaModal = document.getElementById('modal-fecha');
    if (fechaModal) fechaModal.innerText = fechaHoraTexto;

    // Mostrar modal emergente
    modal.style.display = 'block';
}

function cerrarNoticia() {
    const modal = document.getElementById('modal-noticia');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Cierra la ventana emergente al hacer clic fuera del contenido
window.onclick = function(event) {
    const modalNoticia = document.getElementById('modal-noticia');
    const modalRadio = document.getElementById('radio-modal-flotante');
    const modalLoc = document.getElementById('modal-otras-loc');

    if (event.target === modalNoticia) modalNoticia.style.display = 'none';
    if (event.target === modalRadio) modalRadio.style.display = 'none';
    if (event.target === modalLoc) modalLoc.style.display = 'none';
};

// -------------------------------------------------------------
// 4. FUNCIONES AUXILIARES Y REPRODUCTOR
// -------------------------------------------------------------
function formatearFechaYHora(fechaCruda, horaCruda) {
  if (!fechaCruda) return '';

  let objFecha = new Date(fechaCruda);
  if (!isNaN(objFecha.getTime())) {
    let dia = String(objFecha.getDate()).padStart(2, '0');
    let mes = String(objFecha.getMonth() + 1).padStart(2, '0');
    let anio = objFecha.getFullYear();
    let horas = String(objFecha.getHours()).padStart(2, '0');
    let minutos = String(objFecha.getMinutes()).padStart(2, '0');
    
    if (horas !== '00' || minutos !== '00') {
      return `${dia}/${mes}/${anio} - ${horas}:${minutos}`;
    }
    return `${dia}/${mes}/${anio}`;
  }

  let fechaStr = String(fechaCruda).trim();
  if (fechaStr.includes('T')) {
    fechaStr = fechaStr.split('T')[0];
  } else if (fechaStr.length > 10) {
    fechaStr = fechaStr.substring(0, 10);
  }

  return fechaStr;
}

function filterNews() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtradas = todasLasNoticias.filter(n => 
        ((n.titulo || n["Título"]) && (n.titulo || n["Título"]).toLowerCase().includes(query))
    );
    renderizarNoticias(filtradas);
}

function abrirPlayer() {
    const modal = document.getElementById('radio-modal-flotante');
    const audio = document.getElementById('audio-stream');
    if (modal) modal.style.display = 'block';
    if (audio) {
        audio.play().catch(e => console.log("Autoplay bloqueado:", e));
    }
}

function cerrarPlayer() {
    const modal = document.getElementById('radio-modal-flotante');
    const audio = document.getElementById('audio-stream');
    if (modal) modal.style.display = 'none';
    if (audio) {
        audio.pause();
    }
}

function cambiarVolumen(valor) {
    const audio = document.getElementById('audio-stream');
    const valSpan = document.getElementById('volumeValue');
    if (audio) {
        audio.volume = valor / 100;
    }
    if (valSpan) {
        valSpan.innerText = valor;
    }
}

function abrirModalOtrasLoc() {
    const modal = document.getElementById('modal-otras-loc');
    if (modal) modal.style.display = 'block';
}

function cerrarModalOtrasLoc() {
    const modal = document.getElementById('modal-otras-loc');
    if (modal) modal.style.display = 'none';
}

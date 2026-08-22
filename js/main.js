// URL de tu API del Portal
const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";

// URL del script para Minuto 1
const urlMinutoUno = "https://script.google.com/macros/s/AKfycbzR7SwIz2RhDD5XS9Cu15qMz7jvimJBIIQ-VBG3kcIOlInJlDxw2T-jpnpkC65kAAng/exec";

// Imagen SVG de respaldo
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
// BÚSQUEDA ROBUSTA DE CAMPOS EN EL OBJETO DE GOOGLE SHEETS
// -------------------------------------------------------------
function obtenerValorPropiedad(obj, llavesPosibles) {
    if (!obj || typeof obj !== 'object') return '';
    const llavesObjeto = Object.keys(obj);
    for (let posible of llavesPosibles) {
        const encontrada = llavesObjeto.find(k => k.trim().toLowerCase() === posible.trim().toLowerCase());
        if (encontrada && obj[encontrada] !== undefined && obj[encontrada] !== null && String(obj[encontrada]).trim() !== '') {
            return String(obj[encontrada]).trim();
        }
    }
    return '';
}

// -------------------------------------------------------------
// EXTRAER MINIATURA SI ES IMAGEN O YOUTUBE
// -------------------------------------------------------------
function obtenerUrlMultimedia(rawMultimedia, urlEnlace) {
    let urlAProcesar = rawMultimedia || urlEnlace || '';
    if (!urlAProcesar || typeof urlAProcesar !== 'string') return { url: imgFallback, esVideo: false };

    let urlTrim = urlAProcesar.trim();

    // Detección de video de YouTube
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlTrim.match(regExp);

    if (match && match[2].length === 11) {
        const videoId = match[2];
        return {
            url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            esVideo: true
        };
    }

    // Si es una URL de imagen válida o enlace directo
    if (urlTrim.startsWith('http://') || urlTrim.startsWith('https://') || urlTrim.startsWith('data:image')) {
        return { url: urlTrim, esVideo: false };
    }

    return { url: imgFallback, esVideo: false };
}

// -------------------------------------------------------------
// FILTRO DE NOTICIAS RECIENTES (HASTA 3 DÍAS / 72 HORAS)
// -------------------------------------------------------------
function esNoticiaReciente(fechaRaw) {
    if (!fechaRaw) return true;
    try {
        const fechaNoticia = new Date(fechaRaw);
        if (isNaN(fechaNoticia.getTime())) return true;
        
        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaNoticia) / (1000 * 60 * 60);
        return diferenciaHoras <= 72; // Hasta 3 días de antigüedad
    } catch (e) {
        return true;
    }
}

// -------------------------------------------------------------
// 1. NOTICIAS DEL PORTAL (MÁXIMO 6 POR SECCIÓN)
// -------------------------------------------------------------
function cargarNoticiasPortal() {
    fetch(urlAPI)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) return;
            
            // Filtrar noticias publicadas en las últimas 72 horas
            todasLasNoticias = data.filter(n => {
                let fecha = obtenerValorPropiedad(n, ['fecha', 'Fecha', 'date']);
                return esNoticiaReciente(fecha);
            });
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

    // Contadores para limitar a un máximo de 6 noticias por categoría
    let contProvincial = 0;
    let contNacional = 0;
    let contInternacional = 0;

    noticias.forEach(noticia => {
        const cat = (obtenerValorPropiedad(noticia, ['categoria', 'Categoría']) || 'General').trim().toLowerCase();

        // Control de límite (máximo 6 por cada sección)
        if (cat === 'provincial' && contProvincial >= 6) return;
        if (cat === 'nacional' && contNacional >= 6) return;
        if (cat === 'internacional' && contInternacional >= 6) return;

        const card = document.createElement('article');
        card.className = 'card-noticia';
        card.onclick = () => abrirModalNoticia(noticia);

        let fechaHoraTexto = formatearFechaYHora(
            obtenerValorPropiedad(noticia, ['fecha', 'Fecha']),
            obtenerValorPropiedad(noticia, ['hora', 'Hora'])
        );
        
        let rawMultimedia = obtenerValorPropiedad(noticia, ['imagen/multimedia', 'imagen', 'Imagen', 'image', 'urlimagen', 'multimedia']);
        let rawEnlace = obtenerValorPropiedad(noticia, ['enlace', 'Enlace', 'link', 'url']);
        const multimediaInfo = obtenerUrlMultimedia(rawMultimedia, rawEnlace);
        const tituloTexto = obtenerValorPropiedad(noticia, ['noticia', 'Noticia', 'titulo', 'Título', 'title']) || 'Sin título';

        card.innerHTML = `
            <div style="position: relative; width: 100%; height: 160px; overflow: hidden; background: #222;">
                <img src="${multimediaInfo.url}" alt="${tituloTexto}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${imgFallback}'">
                ${multimediaInfo.esVideo ? `
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); border-radius: 50%; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 14px solid #fff; margin-left: 3px;"></div>
                    </div>
                ` : ''}
            </div>
            <div class="card-content">
                <span class="badge">${obtenerValorPropiedad(noticia, ['categoria', 'Categoría']) || 'General'}</span>
                <span style="font-size: 0.7rem; color: #777; display: block; margin-top: 4px;">${fechaHoraTexto}</span>
                <h3>${tituloTexto}</h3>
            </div>
        `;

        if (cat === 'provincial' && gridProvinciales) {
            gridProvinciales.appendChild(card);
            contProvincial++;
        } else if (cat === 'nacional' && gridNacionales) {
            gridNacionales.appendChild(card);
            contNacional++;
        } else if (cat === 'internacional' && gridInternacionales) {
            gridInternacionales.appendChild(card);
            contInternacional++;
        }
    });
}

// -------------------------------------------------------------
// 2. MINUTO 1 (LEER 'Noticia', 'Enlace', 'Imagen')
// -------------------------------------------------------------
async function cargarNoticiasMinutoUno() {
    const contenedor = document.getElementById('grid-minutouno');
    if (!contenedor) return;

    try {
        const res = await fetch(urlMinutoUno);
        const noticias = await res.json();

        contenedor.innerHTML = '';

        let noticiasValidas = Array.isArray(noticias) ? noticias : [];

        // Filtrar por fecha (3 días)
        noticiasValidas = noticiasValidas.filter(noti => {
            let fecha = obtenerValorPropiedad(noti, ['fecha', 'Fecha', 'date']);
            return esNoticiaReciente(fecha);
        });

        // Filtrar filas vacías o defectuosas
        noticiasValidas = noticiasValidas.filter(noti => {
            let tit = obtenerValorPropiedad(noti, ['noticia', 'Noticia', 'titulo', 'Título', 'title']);
            return tit && tit.length > 3 && tit.toLowerCase() !== 'minutouno';
        });

        // Tomar hasta 3 noticias recientes para el bloque de Minuto 1
        const noticiasMostradas = noticiasValidas.slice(0, 3);

        if (noticiasMostradas.length === 0) {
            contenedor.innerHTML = '<p style="color: #666; font-size: 0.9rem;">No hay noticias recientes de Minuto 1 en los últimos 3 días.</p>';
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

            const tituloTexto = obtenerValorPropiedad(noti, ['noticia', 'Noticia', 'titulo', 'Título', 'title']);
            const enlaceUrl = obtenerValorPropiedad(noti, ['enlace', 'Enlace', 'link', 'url']) || '#';
            const rawMultimedia = obtenerValorPropiedad(noti, ['imagen', 'Imagen', 'image', 'urlimagen', 'multimedia']);
            const fechaVal = obtenerValorPropiedad(noti, ['fecha', 'Fecha', 'date']);
            
            const multimediaInfo = obtenerUrlMultimedia(rawMultimedia, enlaceUrl);
            let fechaHoraTexto = formatearFechaYHora(fechaVal, obtenerValorPropiedad(noti, ['hora', 'Hora']));

            card.innerHTML = `
                <div>
                    <div style="position: relative; width: 100%; height: 180px; overflow: hidden; background: #111;">
                        <img src="${multimediaInfo.url}" alt="${tituloTexto}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${imgFallback}'">
                        ${multimediaInfo.esVideo ? `
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.75); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
                                <div style="width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-left: 14px solid #fff; margin-left: 3px;"></div>
                            </div>
                        ` : ''}
                    </div>
                    <div style="padding: 15px;">
                        <span class="badge" style="background: #e63946; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Minuto 1</span>
                        ${fechaHoraTexto ? `<span style="font-size: 0.75rem; color: #777; display: block; margin-top: 6px;">${fechaHoraTexto}</span>` : ''}
                        <h3 style="font-size: 1rem; margin: 8px 0 0 0; color: #1a1a1a; line-height: 1.4;">${tituloTexto}</h3>
                    </div>
                </div>
                <div style="padding: 15px;">
                    <button type="button" class="btn-leer-mas" style="width: 100%; border: none; background: #d9534f; color: #fff; padding: 9px 12px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">
                        Ver noticia →
                    </button>
                </div>
            `;

            card.onclick = () => {
                abrirModalNoticia({
                    categoria: 'Minuto 1',
                    titulo: tituloTexto,
                    imagen: rawMultimedia || multimediaInfo.url,
                    enlace: enlaceUrl,
                    cuerpo: tituloTexto,
                    fecha: fechaVal,
                    hora: obtenerValorPropiedad(noti, ['hora', 'Hora'])
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
// 3. VENTANA EMERGENTE (MODAL INTERNO) CON BOTÓN DE CIERRE
// -------------------------------------------------------------
function abrirModalNoticia(noticia) {
    const modal = document.getElementById('modal-noticia');
    if (!modal) return;

    const tituloNoticia = obtenerValorPropiedad(noticia, ['noticia', 'Noticia', 'titulo', 'Título', 'title']) || noticia.titulo || 'Noticia';
    const rawMultimedia = obtenerValorPropiedad(noticia, ['imagen', 'Imagen', 'imagen/multimedia', 'multimedia']) || noticia.imagen;
    const rawEnlace = obtenerValorPropiedad(noticia, ['enlace', 'Enlace', 'link', 'url']) || noticia.enlace;
    
    const multimediaInfo = obtenerUrlMultimedia(rawMultimedia, rawEnlace);

    const elemCategoria = document.getElementById('modal-categoria');
    if (elemCategoria) elemCategoria.innerText = noticia.categoria || 'Minuto 1';

    const elemTitulo = document.getElementById('modal-titulo');
    if (elemTitulo) elemTitulo.innerText = tituloNoticia;
    
    const imgModal = document.getElementById('modal-imagen');
    if (imgModal) {
        imgModal.src = multimediaInfo.url;
        imgModal.onerror = function() { this.src = imgFallback; };
    }

    const cuerpoModal = document.getElementById('modal-cuerpo');
    if (cuerpoModal) {
        let textoCuerpo = obtenerValorPropiedad(noticia, ['cuerpo', 'descripcion', 'resumen', 'copete', 'detalle']) || noticia.cuerpo || tituloNoticia;
        let enlaceUrl = rawEnlace || '#';

        let contenidoHtml = `<p style="font-size: 1rem; line-height: 1.5; color: #333;">${textoCuerpo}</p>`;

        if (enlaceUrl && enlaceUrl !== '#') {
            contenidoHtml += `<br><a href="${enlaceUrl}" target="_blank" style="display: inline-block; background: #d9534f; color: #fff; padding: 10px 18px; border-radius: 4px; text-decoration: none; font-weight: bold; margin-top: 10px;">Abrir enlace original ↗</a>`;
        }
        cuerpoModal.innerHTML = contenidoHtml;
    }

    const fechaHoraTexto = formatearFechaYHora(
        obtenerValorPropiedad(noticia, ['fecha', 'Fecha']),
        obtenerValorPropiedad(noticia, ['hora', 'Hora'])
    );
    const fechaModal = document.getElementById('modal-fecha');
    if (fechaModal) fechaModal.innerText = fechaHoraTexto;

    modal.style.display = 'block';
}

function cerrarNoticia() {
    const modal = document.getElementById('modal-noticia');
    if (modal) {
        modal.style.display = 'none';
    }
}

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
    const filtradas = todasLasNoticias.filter(n => {
        let t = obtenerValorPropiedad(n, ['noticia', 'Noticia', 'titulo', 'Título', 'title']).toLowerCase();
        let c = obtenerValorPropiedad(n, ['cuerpo', 'descripcion']).toLowerCase();
        return t.includes(query) || c.includes(query);
    });
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

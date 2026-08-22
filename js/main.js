// URL de tu API del Portal
const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";

// URL del script para Minuto 1
const urlMinutoUno = "https://script.google.com/macros/s/AKfycbzR7SwIz2RhDD5XS9Cu15qMz7jvimJBIIQ-VBG3kcIOlInJlDxw2T-jpnpkC65kAAng/exec";

// Placeholder SVG local (no requiere conexión de red)
const imgFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='180' viewBox='0 0 300 180'><rect width='100%' height='100%' fill='%23cccccc'/><text x='50%' y='50%' fill='%23666666' font-family='sans-serif' font-size='16' text-anchor='middle' dy='.3em'>Sin Imagen</text></svg>";

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
// 1. CARGA DE NOTICIAS PROPIAS DEL PORTAL
// -------------------------------------------------------------
function cargarNoticiasPortal() {
    fetch(urlAPI)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) return;
            todasLasNoticias = data;
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

        let fechaHoraTexto = formatearFechaYHora(noticia.fecha || noticia.Fecha, noticia.hora || noticia.Hora);
        const imagenUrl = noticia.imagen || imgFallback;

        card.innerHTML = `
            <img src="${imagenUrl}" alt="${noticia.titulo || ''}" onerror="this.src='${imgFallback}'">
            <div class="card-content">
                <span class="badge">${noticia.categoria || 'General'}</span>
                <span style="font-size: 0.7rem; color: #777; display: block; margin-top: 4px;">${fechaHoraTexto}</span>
                <h3>${noticia.titulo || 'Sin título'}</h3>
            </div>
        `;

        if (cat === 'provincial' && gridProvinciales) gridProvinciales.appendChild(card);
        else if (cat === 'nacional' && gridNacionales) gridNacionales.appendChild(card);
        else if (cat === 'internacional' && gridInternacionales) gridInternacionales.appendChild(card);
    });
}

// -------------------------------------------------------------
// 2. CARGA DE NOTICIAS DE MINUTO 1
// -------------------------------------------------------------
async function cargarNoticiasMinutoUno() {
    const contenedor = document.getElementById('grid-minutouno');
    if (!contenedor) return;

    try {
        const res = await fetch(urlMinutoUno);
        const noticias = await res.json();

        contenedor.innerHTML = '';

        const noticiasMostradas = Array.isArray(noticias) ? noticias.slice(0, 3) : [];

        if (noticiasMostradas.length === 0) {
            contenedor.innerHTML = '<p style="color: #666;">No hay noticias de Minuto 1 disponibles en este momento.</p>';
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

            const imagenUrl = noti.imagen || noti.image || noti.urlImagen || imgFallback;
            const tituloTexto = noti.titulo || noti.title || 'Sin título';
            const enlaceUrl = noti.enlace || noti.link || noti.url || '#';
            const cuerpoTexto = noti.cuerpo || noti.descripcion || noti.description || noti.resumen || '';

            card.innerHTML = `
                <div>
                    <img src="${imagenUrl}" alt="${tituloTexto}" style="width: 100%; height: 180px; object-fit: cover;" onerror="this.src='${imgFallback}'">
                    <div style="padding: 15px;">
                        <span class="badge" style="background: #e63946; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Minuto 1</span>
                        <h3 style="font-size: 1rem; margin: 10px 0; color: #1a1a1a; line-height: 1.4;">${tituloTexto}</h3>
                    </div>
                </div>
                <div style="padding: 0 15px 15px 15px;">
                    <button type="button" class="btn-leer-mas" style="width: 100%; border: none; background: #d9534f; color: #fff; padding: 8px 12px; border-radius: 4px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">
                        Leer noticia →
                    </button>
                </div>
            `;

            card.onclick = () => {
                abrirModalNoticia({
                    categoria: 'Minuto 1',
                    titulo: tituloTexto,
                    imagen: imagenUrl !== imgFallback ? imagenUrl : '',
                    cuerpo: cuerpoTexto || 'Haz clic abajo para ver la nota original completa.',
                    fecha: noti.fecha || noti.Fecha,
                    hora: noti.hora || noti.Hora
                });
            };

            const btn = card.querySelector('.btn-leer-mas');
            if (enlaceUrl !== '#') {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    window.open(enlaceUrl, '_blank');
                };
            }

            contenedor.appendChild(card);
        });

    } catch (err) {
        console.error("Error al cargar Minuto 1:", err);
        contenedor.innerHTML = '<p style="color: #666;">No se pudieron cargar las noticias de Minuto 1.</p>';
    }
}

// -------------------------------------------------------------
// 3. FUNCIONES AUXILIARES Y BUSCADOR
// -------------------------------------------------------------
function formatearFechaYHora(fechaCruda, horaCruda) {
  if (!fechaCruda) return '';

  let fechaStr = String(fechaCruda).trim();
  let fechaLimpia = '';
  let horaFinal = '';

  if (fechaStr.includes('T')) {
    fechaLimpia = fechaStr.split('T')[0];
  } else {
    fechaLimpia = fechaStr.substring(0, 10);
  }

  let fuenteHora = horaCruda;
  if ((!fuenteHora || String(fuenteHora).trim() === '' || String(fuenteHora).trim() === 'null') && fechaStr.includes('T')) {
    fuenteHora = fechaStr.split('T')[1];
  }

  if (fuenteHora !== undefined && fuenteHora !== null && String(fuenteHora).trim() !== '' && String(fuenteHora).trim() !== 'null') {
    let hStr = String(fuenteHora).trim().replace('Z', '');
    let match = hStr.match(/\d{2}:\d{2}/);
    if (match) {
      horaFinal = match[0];
    } else if (hStr.toLowerCase().includes('m')) {
      horaFinal = hStr;
    }
  }

  return horaFinal ? `${fechaLimpia} - ${horaFinal}` : fechaLimpia;
}

function filterNews() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtradas = todasLasNoticias.filter(n => 
        (n.titulo && n.titulo.toLowerCase().includes(query)) ||
        (n.cuerpo && n.cuerpo.toLowerCase().includes(query))
    );
    renderizarNoticias(filtradas);
}

function abrirModalNoticia(noticia) {
    document.getElementById('modal-categoria').innerText = noticia.categoria || '';
    document.getElementById('modal-titulo').innerText = noticia.titulo || '';
    document.getElementById('modal-imagen').src = noticia.imagen || imgFallback;
    document.getElementById('modal-cuerpo').innerText = noticia.cuerpo || '';

    let fechaHoraTexto = formatearFechaYHora(noticia.fecha || noticia.Fecha, noticia.hora || noticia.Hora);
    document.getElementById('modal-fecha').innerText = fechaHoraTexto;

    document.getElementById('modal-noticia').style.display = 'block';
}

function cerrarNoticia() {
    document.getElementById('modal-noticia').style.display = 'none';
}

// -------------------------------------------------------------
// 4. REPRODUCTOR Y CLIMA
// -------------------------------------------------------------
function abrirPlayer() {
    const modal = document.getElementById('radio-modal-flotante');
    const audio = document.getElementById('audio-stream');
    modal.style.display = 'block';
    if (audio) {
        audio.play().catch(e => console.log("Autoplay bloqueado:", e));
    }
}

function cerrarPlayer() {
    const modal = document.getElementById('radio-modal-flotante');
    const audio = document.getElementById('audio-stream');
    modal.style.display = 'none';
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
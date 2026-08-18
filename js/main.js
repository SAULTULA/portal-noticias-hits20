let todasLasNoticias = []; // Variable global para guardar los datos de la API

document.addEventListener("DOMContentLoaded", function () {
  const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";

  fetch(urlAPI)
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data)) return;
      todasLasNoticias = data; 

      renderizarNoticias(todasLasNoticias);

      const urlParams = new URLSearchParams(window.location.search);
      const noticiaId = urlParams.get('id');
      if (noticiaId) {
        const encontrada = data.find(n => String(n.id) === String(noticiaId));
        if (encontrada) abrirNoticiaModal(encontrada);
      }
    })
    .catch(error => console.error('Error al conectar con la API:', error));

  // Inicializar la funcionalidad de arrastrar el reproductor flotante
  inicializarArrastrePlayer();
});

// Función auxiliar para transformar enlaces de video (YouTube, etc.) en formatos incrustables seguros
function obtenerHtmlMultimedia(urlVideo, urlImagen) {
  if (urlVideo && urlVideo.trim() !== "") {
    let videoUrl = urlVideo.trim();
    // Si es un enlace de YouTube normal o corto, lo convertimos a embebido
    if (videoUrl.includes("youtube.com/watch?v=")) {
      let videoId = videoUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        return `<iframe src="https://www.youtube.com/embed/${videoId}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>`;
      }
    } else if (videoUrl.includes("youtu.be/")) {
      let videoId = videoUrl.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) {
        return `<iframe src="https://www.youtube.com/embed/${videoId}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>`;
      }
    }
    // Para cualquier otro tipo de video de red social o enlace directo de video con reproductor nativo
    return `<video src="${videoUrl}" controls style="width: 100%; height: 100%; object-fit: cover; background: #000;"></video>`;
  }
  
  // Por defecto retorna la imagen si no hay video
  return `<img src="${urlImagen || ''}" alt="Imagen noticia" style="width: 100%; height: 100%; object-fit: cover; display: block;">`;
}

function renderizarNoticias(listaParaPintar) {
  const nacionales = document.getElementById('grid-nacionales');
  const internacionales = document.getElementById('grid-internacionales');
  const provinciales = document.getElementById('grid-provinciales');

  if (nacionales) nacionales.innerHTML = '';
  if (internacionales) internacionales.innerHTML = '';
  if (provinciales) provinciales.innerHTML = '';

  const ahora = new Date();
  const tresDiasEnMilisegundos = 3 * 24 * 60 * 60 * 1000;
  const terminoBusqueda = document.getElementById('searchInput') ? document.getElementById('searchInput').value.trim() : '';

  // --- BLOQUE DE ORDENAMIENTO REFORZADO ---
  let listaOrdenada = [...listaParaPintar].sort((a, b) => {
    let fechaA = new Date(a.fecha || a.Fecha).getTime() || 0;
    let fechaB = new Date(b.fecha || b.Fecha).getTime() || 0;
    
    // Si la fecha es diferente, ordenamos por fecha
    if (fechaB !== fechaA) return fechaB - fechaA;

    // Si la fecha es igual, comparamos la hora (formato HH:MM)
    let horaA = a.hora || a.Hora || "00:00";
    let horaB = b.hora || b.Hora || "00:00";
    return horaB.localeCompare(horaA);
  });
  // ---------------------------------------

  listaOrdenada.forEach(noticia => {
    const categoria = (noticia.categoria || '').toLowerCase().trim();
    let contenedor = null;

    if (categoria.includes('internacional')) {
      contenedor = internacionales;
    } else if (categoria.includes('nacional')) {
      contenedor = nacionales;
    } else if (categoria.includes('provincial')) {
      contenedor = provinciales;
    }

    if (contenedor) {
      let fechaCruda = noticia.fecha || noticia.Fecha;
      let fechaNoticia = new Date(fechaCruda || 0);
      let diferenciaTiempo = ahora.getTime() - fechaNoticia.getTime();
      let esMasDeTresDias = diferenciaTiempo > tresDiasEnMilisegundos;

      if (esMasDeTresDias && !terminoBusqueda) return; 

      const card = document.createElement('div');
      card.className = 'card';
      
      let fechaTexto = formatearFechaYHora(fechaCruda, noticia.hora || noticia.Hora);
      let contenidoMultimediaHtml = obtenerHtmlMultimedia(noticia.video || noticia.Video, noticia.imagen || noticia.Imagen);

      card.innerHTML = `
        <div style="width: 100%; height: 160px; overflow: hidden; background: #000;">
          ${contenidoMultimediaHtml}
        </div>
        <div class="card-body" style="padding: 12px;">
          <div style="font-size: 0.75rem; color: #d9534f; font-weight: bold; margin-bottom: 6px;">${fechaTexto}</div>
          <div class="card-title" style="font-weight: 600; font-size: 0.85rem; line-height: 1.2; height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: #222;">
            ${noticia.titulo || 'Sin título'}
          </div>
          <p class="card-desc" style="font-size: 0.8rem; color: #555; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${noticia.descripcion || ''}</p>
        </div>
      `;

      card.addEventListener('click', () => abrirNoticiaModal(noticia));
      contenedor.appendChild(card);
    }
  });
}

function filterNews() {
  const inputEl = document.getElementById('searchInput');
  if (!inputEl) return;
  const texto = inputEl.value.toLowerCase().trim();

  if (texto === "") {
    renderizarNoticias(todasLasNoticias);
    return;
  }

  const resultados = todasLasNoticias.filter(noticia => 
    (noticia.titulo && noticia.titulo.toLowerCase().includes(texto)) || 
    (noticia.descripcion && noticia.descripcion.toLowerCase().includes(texto)) ||
    (noticia.cuerpo && noticia.cuerpo.toLowerCase().includes(texto))
  );

  renderizarNoticias(resultados);
}

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

function abrirNoticiaModal(noticia) {
  document.getElementById('modal-categoria').innerText = noticia.categoria || '';
  document.getElementById('modal-titulo').innerText = noticia.titulo || '';
  document.getElementById('modal-cuerpo').innerText = noticia.cuerpo || '';

  const modalImagenElem = document.getElementById('modal-imagen');
  if (modalImagenElem) {
    let multimediaModalHtml = obtenerHtmlMultimedia(noticia.video || noticia.Video, noticia.imagen || noticia.Imagen);
    
    if (modalImagenElem.tagName === 'IMG') {
      if (noticia.video && noticia.video.trim() !== "") {
        let parentModalImg = modalImagenElem.parentNode;
        let videoContainerModal = document.getElementById('modal-video-container');
        if (!videoContainerModal) {
          videoContainerModal = document.createElement('div');
          videoContainerModal.id = 'modal-video-container';
          videoContainerModal.style.width = '100%';
          videoContainerModal.style.height = '300px';
          videoContainerModal.style.maxHeight = '50vh';
          videoContainerModal.style.background = '#000';
          parentModalImg.insertBefore(videoContainerModal, modalImagenElem);
        }
        videoContainerModal.innerHTML = multimediaModalHtml;
        modalImagenElem.style.display = 'none';
      } else {
        modalImagenElem.style.display = 'block';
        modalImagenElem.src = noticia.imagen || '';
        let videoContainerModal = document.getElementById('modal-video-container');
        if (videoContainerModal) videoContainerModal.innerHTML = '';
      }
    }
  }

  const elFecha = document.getElementById('modal-fecha');
  if (elFecha) elFecha.innerText = formatearFechaYHora(noticia.fecha || noticia.Fecha, noticia.hora || noticia.Hora);

  document.getElementById('modal-noticia').style.display = 'flex';
  const nuevaURL = `${window.location.pathname}?id=${noticia.id}`;
  window.history.pushState({ path: nuevaURL }, '', nuevaURL);
}

function cerrarNoticia() {
  document.getElementById('modal-noticia').style.display = 'none';
  window.history.pushState({ path: window.location.pathname }, '', window.location.pathname);
}

// ==========================================
// CONTROLADORES DEL REPRODUCTOR FLOTANTE Y VOLUMEN
// ==========================================
function abrirPlayer() {
  const playerFlotante = document.getElementById('radio-modal-flotante');
  const audioElement = document.getElementById('audio-stream');
  const volumeSlider = document.getElementById('volumeSlider');

  if (playerFlotante) {
    playerFlotante.style.display = 'block'; 
  }
  
  if (audioElement) {
    let volInicial = volumeSlider ? volumeSlider.value / 100 : 0.4;
    audioElement.volume = volInicial;

    audioElement.play().catch(error => {
      console.log("El navegador requiere interacción para reproducir automáticamente:", error);
    });
  }
}

function cerrarPlayer() {
  const playerFlotante = document.getElementById('radio-modal-flotante');
  const audioElement = document.getElementById('audio-stream');

  if (audioElement) {
    audioElement.pause(); 
  }

  if (playerFlotante) {
    playerFlotante.style.display = 'none'; 
  }
}

function cambiarVolumen(valor) {
  const audioElement = document.getElementById('audio-stream');
  const volumeValue = document.getElementById('volumeValue');

  if (audioElement) {
    audioElement.volume = valor / 100;
  }

  if (volumeValue) {
    volumeValue.innerText = valor;
  }
}

// ==========================================
// LÓGICA DE ARRASTRE (DRAG & DROP) DEL REPRODUCTOR
// ==========================================
function inicializarArrastrePlayer() {
  const player = document.getElementById('radio-modal-flotante');
  const header = document.getElementById('radio-header-drag');

  if (!player || !header) return;

  let isDragging = false;
  let startX, startY, initialX, initialY;

  function dragStart(e) {
    if (e.target.classList.contains('radio-flotante-close')) return;

    isDragging = true;
    
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

    startX = clientX;
    startY = clientY;

    const rect = player.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    player.style.left = initialX + 'px';
    player.style.top = initialY + 'px';
    player.style.bottom = 'auto';
    player.style.right = 'auto';

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', dragEnd);
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;

    let newX = initialX + dx;
    let newY = initialY + dy;

    const maxX = window.innerWidth - player.offsetWidth;
    const maxY = window.innerHeight - player.offsetHeight;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    player.style.left = newX + 'px';
    player.style.top = newY + 'px';
  }

  function dragEnd() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', dragEnd);
  }

  header.addEventListener('mousedown', dragStart);
  header.addEventListener('touchstart', dragStart, { passive: false });
}

// ==========================================
// CONTROLADORES Y CARGA DEL MODAL DE OTRAS LOCALIDADES
// ==========================================
function abrirModalOtrasLoc() {
  const modalLoc = document.getElementById('modal-otras-loc');
  if (modalLoc) {
    modalLoc.style.display = 'flex';
    cargarOtrasLocalidadesClima();
  }
}

function cerrarModalOtrasLoc() {
  const modalLoc = document.getElementById('modal-otras-loc');
  if (modalLoc) {
    modalLoc.style.display = 'none';
  }
}

function cargarOtrasLocalidadesClima() {
  const gridContainer = document.getElementById('grid-otras-loc');
  if (!gridContainer) return;

  gridContainer.innerHTML = '<div class="weather-item">Cargando localidades...</div>';

  const localidades = [
    { nombre: 'San Luis', lat: -33.3017, lon: -66.3378 },
    { nombre: 'Villa Mercedes', lat: -33.6749, lon: -65.4561 },
    { nombre: 'Merlo', lat: -32.3481, lon: -65.0122 },
    { nombre: 'La Punta', lat: -33.1833, lon: -66.3167 },
    { nombre: 'Juana Koslay', lat: -33.2667, lon: -66.2167 },
    { nombre: 'San Francisco', lat: -32.5833, lon: -65.9500 },
    { nombre: 'Concarán', lat: -32.5599, lon: -65.2531 },
    { nombre: 'Quines', lat: -32.2333, lon: -65.8833 },
    { nombre: 'Naschel', lat: -32.9167, lon: -65.3833 },
    { nombre: 'Beazley', lat: -33.6000, lon: -66.7833 },
    { nombre: 'Tilisarao', lat: -32.7667, lon: -65.2000 },
    { nombre: 'Cortaderas', lat: -32.4167, lon: -65.0167 },
    { nombre: 'Carpintería', lat: -32.4333, lon: -65.0000 },
    { nombre: 'Buena Esperanza', lat: -34.7333, lon: -65.2500 },
    { nombre: 'Nogolí', lat: -32.9333, lon: -66.2667 },
    { nombre: 'Candelaria', lat: -32.4667, lon: -65.8000 },
    { nombre: 'San Martín', lat: -32.6167, lon: -65.5333 },
    { nombre: 'Luján', lat: -32.3667, lon: -65.9333 },
    { nombre: 'Balde', lat: -33.3167, lon: -66.7667 },
    { nombre: 'La Toma', lat: -33.0500, lon: -65.6167 },
    { nombre: 'Alto Pelado', lat: -33.7167, lon: -66.0833 },
    { nombre: 'Alto Pencoso', lat: -33.3333, lon: -67.0167 },
    { nombre: 'Anchorena', lat: -34.6833, lon: -65.5000 },
    { nombre: 'Arizona', lat: -35.7333, lon: -65.3333 },
    { nombre: 'Cazador', lat: -32.8833, lon: -65.6833 },
    { nombre: 'Chosmes', lat: -33.2000, lon: -66.7167 },
    { nombre: 'Daniel Donovan', lat: -33.7833, lon: -65.8333 },
    { nombre: 'Desaguadero', lat: -33.4333, lon: -67.6333 },
    { nombre: 'El Volcán', lat: -33.2833, lon: -66.0667 },
    { nombre: 'El Milagro', lat: -32.1833, lon: -65.7167 },
    { nombre: 'Estancia Grande', lat: -33.2333, lon: -66.1167 },
    { nombre: 'Fortuna', lat: -34.4667, lon: -65.4167 },
    { nombre: 'Fraga', lat: -33.5167, lon: -65.9667 },
    { nombre: 'Jarilla', lat: -33.3500, lon: -67.3167 },
    { nombre: 'Juan Jorba', lat: -33.6833, lon: -65.2833 },
    { nombre: 'Juan Llerena', lat: -33.4500, lon: -65.4833 },
    { nombre: 'Juan Wenceslao Gez', lat: -33.1500, lon: -65.8833 },
    { nombre: 'La Calera', lat: -32.6833, lon: -66.0333 },
    { nombre: 'Lafinur', lat: -32.1833, lon: -65.5167 },
    { nombre: 'La Florida', lat: -33.1500, lon: -66.1833 },
    { nombre: 'La Majada', lat: -32.5500, lon: -65.7500 },
    { nombre: 'La Punilla', lat: -33.0667, lon: -65.4667 },
    { nombre: 'Las Chacras', lat: -32.6333, lon: -65.3333 },
    { nombre: 'Las Lagunas', lat: -32.4833, lon: -65.1167 },
    { nombre: 'Lavaisse', lat: -33.8833, lon: -65.3500 },
    { nombre: 'La Vertiente', lat: -33.1667, lon: -65.3167 },
    { nombre: 'Leandro N. Alem', lat: -32.5167, lon: -65.4167 },
    { nombre: 'Los Cajones', lat: -32.2833, lon: -65.3167 },
    { nombre: 'Los Manantiales', lat: -32.4167, lon: -65.6167 },
    { nombre: 'Los Molles', lat: -32.4000, lon: -65.0167 },
    { nombre: 'Los Puquios', lat: -33.2333, lon: -66.1667 },
    { nombre: 'Nueva Galia', lat: -34.5833, lon: -65.3167 },
    { nombre: 'Papagayos', lat: -32.5333, lon: -65.0167 },
    { nombre: 'Paso de las Carretas', lat: -33.4167, lon: -66.0833 },
    { nombre: 'Paso Grande', lat: -32.8667, lon: -65.6000 },
    { nombre: 'Potrerillo', lat: -32.6500, lon: -65.3333 },
    { nombre: 'Renca', lat: -32.7333, lon: -65.2833 },
    { nombre: 'Río Juan Gómez', lat: -33.0833, lon: -66.2167 },
    { nombre: 'Saladillo', lat: -33.7833, lon: -65.4167 },
    { nombre: 'Salinas del Bebedero', lat: -33.5833, lon: -66.8667 },
    { nombre: 'San Jerónimo', lat: -33.2667, lon: -66.5000 },
    { nombre: 'San José del Morro', lat: -33.6833, lon: -65.4167 },
    { nombre: 'Santa Rosa del Conlara', lat: -32.3333, lon: -65.1833 },
    { nombre: 'Suyuque Nuevo', lat: -33.1167, lon: -66.3333 },
    { nombre: 'Talita', lat: -32.6167, lon: -65.3833 },
    { nombre: 'Unión', lat: -34.3333, lon: -65.3500 },
    { nombre: 'Villa de la Quebrada', lat: -32.9667, lon: -66.3167 },
    { nombre: 'Villa del Carmen', lat: -32.5167, lon: -65.1333 },
    { nombre: 'Villa de Praga', lat: -32.5833, lon: -65.4167 },
    { nombre: 'Villa Larca', lat: -32.4833, lon: -65.0167 },
    { nombre: 'Villa Reynolds', lat: -33.7333, lon: -65.3833 },
    { nombre: 'Zanjitas', lat: -33.6333, lon: -66.4167 }
  ];

  Promise.all(
    localidades.map(loc => 
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current_weather=true`)
        .then(res => res.json())
        .then(data => {
          const temp = data.current_weather ? Math.round(data.current_weather.temperature) : '--';
          const icono = temp !== '--' && temp > 22 ? '☀️' : '☁️';
          return { nombre: loc.nombre, temp, icono };
        })
        .catch(() => ({ nombre: loc.nombre, temp: '--', icono: '☁️' }))
    )
  ).then(resultados => {
    gridContainer.innerHTML = '';
    resultados.forEach(item => {
      const div = document.createElement('div');
      div.className = 'weather-item';
      div.innerHTML = `<span>${item.nombre}:</span> <strong>${item.temp}°C ${item.icono}</strong>`;
      gridContainer.appendChild(div);
    });
  });
}

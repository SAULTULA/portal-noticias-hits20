const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";

// Estado del listado de noticias
let todasLasNoticiasAdmin = [];
let paginaAdmin = 1;
let porPaginaAdmin = 20;
let filtroAdmin = '';

document.addEventListener("DOMContentLoaded", function () {
    cargarNoticiasAdmin();

    document.getElementById('form-admin-noticia').addEventListener('submit', function (e) {
        e.preventDefault();

        const id = document.getElementById('noticia-id').value;
        const titulo = document.getElementById('admin-titulo').value;
        const imagen = document.getElementById('admin-imagen').value;
        const categoria = document.getElementById('admin-categoria').value.trim().toLowerCase();
        const cuerpo = document.getElementById('admin-cuerpo').value;
        const video = document.getElementById('admin-video').value.trim();

        let fecha = document.getElementById('admin-fecha').value;
        let hora = normalizarHora(document.getElementById('admin-hora').value);

        if (fecha && fecha.includes('T')) {
            fecha = fecha.split('T')[0];
        }

        const action = id ? "update" : "create";
        const datos = { action, id, titulo, imagen, categoria, cuerpo, video, fecha, hora };

        fetch(urlAPI, {
            method: 'POST',
            body: JSON.stringify(datos)
        })
        .then(res => res.json())
        .then(data => {
            if (data.resultado === "success") {
                alert(id ? "Noticia actualizada con éxito" : "Noticia publicada con éxito");

                const noticiaIdFinal = id || data.id;
                const baseUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
                const linkCompleto = `${baseUrl}?id=${noticiaIdFinal}`;

                document.getElementById('input-link-compartir').value = linkCompleto;
                document.getElementById('resultado-publicacion').style.display = 'block';

                limpiarFormulario();
                cargarNoticiasAdmin();
            } else {
                alert("Hubo un error al procesar la solicitud.");
            }
        })
        .catch(err => console.error("Error:", err));
    });

    // SEC-013: botón cancelar edición via addEventListener, no inline
    const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
    if (btnCancelarEdicion) {
        btnCancelarEdicion.addEventListener('click', limpiarFormulario);
    }

    // SEC-013: botón copiar link via addEventListener
    const btnCopiarLink = document.getElementById('btn-copiar-link');
    if (btnCopiarLink) {
        btnCopiarLink.addEventListener('click', copiarLinkNoticia);
    }

    // SEC-013: enlace cerrar sesión via addEventListener
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', function (e) {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // ── Buscador y paginación del listado ──
    const inputBuscar = document.getElementById('admin-buscar');
    if (inputBuscar) {
        let temporizadorBusqueda;
        inputBuscar.addEventListener('input', function () {
            clearTimeout(temporizadorBusqueda);
            temporizadorBusqueda = setTimeout(function () {
                filtroAdmin = inputBuscar.value;
                paginaAdmin = 1;
                renderizarTablaAdmin();
            }, 200);
        });
    }

    const selectPorPagina = document.getElementById('admin-por-pagina');
    if (selectPorPagina) {
        selectPorPagina.addEventListener('change', function () {
            porPaginaAdmin = parseInt(selectPorPagina.value, 10) || 20;
            paginaAdmin = 1;
            renderizarTablaAdmin();
        });
    }

    const btnPrev = document.getElementById('admin-prev');
    if (btnPrev) {
        btnPrev.addEventListener('click', function () {
            if (paginaAdmin > 1) {
                paginaAdmin--;
                renderizarTablaAdmin();
            }
        });
    }

    const btnNext = document.getElementById('admin-next');
    if (btnNext) {
        btnNext.addEventListener('click', function () {
            paginaAdmin++;
            renderizarTablaAdmin();
        });
    }
});

// Convierte cualquier formato de hora de la API a "HH:mm"
function normalizarHora(valor) {
    if (valor === undefined || valor === null) return '';
    const texto = String(valor).trim();
    if (!texto || texto === 'null') return '';

    // Formato 12 horas: "05:10 a. m." / "8:30 p. m."
    const doceHoras = texto.match(/(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?/i);
    if (doceHoras) {
        let horas = parseInt(doceHoras[1], 10) % 12;
        if (doceHoras[3].toLowerCase() === 'p') horas += 12;
        return `${String(horas).padStart(2, '0')}:${doceHoras[2]}`;
    }

    // Formato 24 horas: "20:03", "20:03:00", "2026-10-28T20:03:00Z",
    // "Sat Dec 30 1899 20:03:00 GMT-0416 (...)"
    const match = texto.match(/(\d{1,2}):(\d{2})/);
    if (!match) return '';

    const horas = parseInt(match[1], 10);
    if (horas < 0 || horas > 23) return '';
    return `${String(horas).padStart(2, '0')}:${match[2]}`;
}

// Función unificada y blindada para limpiar la fecha y hora de forma exacta
function formatearFechaYHora(fechaCruda, horaCruda) {
    if (!fechaCruda) return '';

    const fechaStr = String(fechaCruda).trim();
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

    horaFinal = normalizarHora(fuenteHora);

    return horaFinal ? `${fechaLimpia} - ${horaFinal}` : fechaLimpia;
}

// Clave numérica para ordenar por fecha y hora (más reciente primero)
function claveOrden(noticia) {
    const fecha = String(noticia.fecha || noticia.Fecha || '').slice(0, 10);
    const hora = normalizarHora(noticia.hora || noticia.Hora) || '00:00';
    const tiempo = Date.parse(`${fecha}T${hora}`);
    return Number.isNaN(tiempo) ? 0 : tiempo;
}

function cargarNoticiasAdmin() {
    fetch(urlAPI)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) {
                todasLasNoticiasAdmin = [];
            } else {
                todasLasNoticiasAdmin = data.slice().sort((a, b) => claveOrden(b) - claveOrden(a));
            }
            paginaAdmin = 1;
            renderizarTablaAdmin();
        })
        .catch(err => {
            console.error("Error al cargar noticias admin:", err);
            const tbody = document.getElementById('lista-admin-body');
            if (!tbody) return;
            tbody.textContent = '';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.style.cssText = 'padding: 15px; text-align: center; color: #e74c3c;';
            td.textContent = 'No se pudieron cargar las noticias. Revisá la conexión e intentá de nuevo.';
            tr.appendChild(td);
            tbody.appendChild(tr);
        });
}

function renderizarTablaAdmin() {
    const tbody = document.getElementById('lista-admin-body');
    if (!tbody) return;
    // SEC-003: limpiar via textContent antes de poblar
    tbody.textContent = '';

    const filtro = filtroAdmin.trim().toLowerCase();
    const filtradas = filtro
        ? todasLasNoticiasAdmin.filter(noticia => {
            const titulo = String(noticia.titulo || '').toLowerCase();
            const categoria = String(noticia.categoria || '').toLowerCase();
            return titulo.includes(filtro) || categoria.includes(filtro);
        })
        : todasLasNoticiasAdmin;

    const total = filtradas.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPaginaAdmin));

    if (paginaAdmin > totalPaginas) paginaAdmin = totalPaginas;
    if (paginaAdmin < 1) paginaAdmin = 1;

    const inicio = (paginaAdmin - 1) * porPaginaAdmin;
    const fin = Math.min(inicio + porPaginaAdmin, total);
    const visibles = filtradas.slice(inicio, fin);

    if (total === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 4;
        td.style.cssText = 'padding: 15px; text-align: center; color: #777;';
        td.textContent = filtro ? 'No hay noticias que coincidan con la búsqueda.' : 'No hay noticias publicadas.';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        visibles.forEach(noticia => {
            // SEC-003: construir fila via DOM, sin innerHTML con datos externos
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #ddd';

            let fechaHoraTexto = formatearFechaYHora(noticia.fecha || noticia.Fecha, noticia.hora || noticia.Hora);
            if (!fechaHoraTexto) fechaHoraTexto = 'Sin fecha';

            const tdFecha = document.createElement('td');
            tdFecha.style.padding = '10px';
            tdFecha.textContent = fechaHoraTexto;

            const tdTitulo = document.createElement('td');
            tdTitulo.style.cssText = 'padding: 10px; font-weight: bold;';
            tdTitulo.textContent = noticia.titulo || '';

            const tdCategoria = document.createElement('td');
            tdCategoria.style.cssText = 'padding: 10px; text-transform: capitalize;';
            tdCategoria.textContent = noticia.categoria || '';

            const tdAcciones = document.createElement('td');
            tdAcciones.style.cssText = 'padding: 10px; text-align: center; display: flex; gap: 8px; justify-content: center;';

            const btnEditar = document.createElement('button');
            btnEditar.style.cssText = 'background: #f39c12; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
            btnEditar.textContent = 'Editar';
            btnEditar.addEventListener('click', () => prepararEdicion(noticia));

            const btnBorrar = document.createElement('button');
            btnBorrar.style.cssText = 'background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
            btnBorrar.textContent = 'Borrar';
            btnBorrar.addEventListener('click', () => borrarNoticia(noticia.id));

            tdAcciones.appendChild(btnEditar);
            tdAcciones.appendChild(btnBorrar);

            tr.appendChild(tdFecha);
            tr.appendChild(tdTitulo);
            tr.appendChild(tdCategoria);
            tr.appendChild(tdAcciones);
            tbody.appendChild(tr);
        });
    }

    const contador = document.getElementById('admin-contador');
    if (contador) {
        contador.textContent = total ? `Mostrando ${inicio + 1}–${fin} de ${total}` : '0 noticias';
    }

    const info = document.getElementById('admin-pagina-info');
    if (info) info.textContent = `Página ${paginaAdmin} de ${totalPaginas}`;

    const btnPrev = document.getElementById('admin-prev');
    const btnNext = document.getElementById('admin-next');
    if (btnPrev) {
        btnPrev.disabled = paginaAdmin <= 1;
        btnPrev.style.opacity = btnPrev.disabled ? '0.45' : '1';
        btnPrev.style.cursor = btnPrev.disabled ? 'default' : 'pointer';
    }
    if (btnNext) {
        btnNext.disabled = paginaAdmin >= totalPaginas;
        btnNext.style.opacity = btnNext.disabled ? '0.45' : '1';
        btnNext.style.cursor = btnNext.disabled ? 'default' : 'pointer';
    }
}

function prepararEdicion(noticia) {
    document.getElementById('noticia-id').value = noticia.id;
    document.getElementById('admin-titulo').value = noticia.titulo;
    document.getElementById('admin-imagen').value = noticia.imagen;
    document.getElementById('admin-video').value = noticia.video || '';
    document.getElementById('admin-categoria').value = (noticia.categoria || '').trim().toLowerCase();
    document.getElementById('admin-cuerpo').value = noticia.cuerpo;

    if (noticia.fecha) {
        const fechaStr = String(noticia.fecha).split('T')[0];
        document.getElementById('admin-fecha').value = fechaStr;
    }

    let horaFuente = noticia.hora;
    if ((!horaFuente || String(horaFuente).trim() === '') && String(noticia.fecha || '').includes('T')) {
        horaFuente = String(noticia.fecha).split('T')[1];
    }
    document.getElementById('admin-hora').value = normalizarHora(horaFuente);

    document.getElementById('btn-guardar').textContent = "Actualizar Noticia";
    document.getElementById('btn-cancelar-edicion').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('form-admin-noticia').reset();
    document.getElementById('noticia-id').value = '';
    document.getElementById('btn-guardar').textContent = "Publicar Noticia";
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
}

function borrarNoticia(id) {
    if (confirm("¿Estás seguro de que deseas eliminar esta noticia?")) {
        fetch(urlAPI, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", id: id })
        })
        .then(res => res.json())
        .then(data => {
            if (data.resultado === "success") {
                alert("Noticia eliminada correctamente.");
                cargarNoticiasAdmin();
            } else {
                alert("No se pudo eliminar la noticia.");
            }
        })
        .catch(err => console.error("Error al borrar:", err));
    }
}

function copiarLinkNoticia() {
    const inputLink = document.getElementById('input-link-compartir');
    inputLink.select();
    navigator.clipboard.writeText(inputLink.value)
        .catch(err => console.error("Error al copiar al portapapeles:", err));

    const aviso = document.getElementById('copiado-aviso');
    aviso.style.display = 'block';
    setTimeout(() => { aviso.style.display = 'none'; }, 3000);
}

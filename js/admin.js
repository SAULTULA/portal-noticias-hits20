const urlAPI = "https://script.google.com/macros/s/AKfycbzrN4pskes2eTBGxvuvsPFuKcm3VoIeUyc4FJGG962DkdMf2MYQYSkhBzji40oRmH1p/exec";

document.addEventListener("DOMContentLoaded", function () {
    cargarNoticiasAdmin();

    document.getElementById('form-admin-noticia').addEventListener('submit', function (e) {
        e.preventDefault();
        
        const id = document.getElementById('noticia-id').value;
        const titulo = document.getElementById('admin-titulo').value;
        const imagen = document.getElementById('admin-imagen').value;
        const categoria = document.getElementById('admin-categoria').value.trim().toLowerCase();
        const cuerpo = document.getElementById('admin-cuerpo').value;
        
        let fecha = document.getElementById('admin-fecha').value;
        let hora = document.getElementById('admin-hora').value;

        if (fecha && fecha.includes('T')) {
            fecha = fecha.split('T')[0];
        }
        if (hora && hora.includes('T')) {
            const partesHora = hora.split('T')[1];
            hora = partesHora ? partesHora.substring(0, 5) : hora;
        }

        const action = id ? "update" : "create";
        const datos = { action, id, titulo, imagen, categoria, cuerpo, fecha, hora };

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
});

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

    if (fuenteHora !== undefined && fuenteHora !== null && String(fuenteHora).trim() !== '' && String(fuenteHora).trim() !== 'null') {
        const hStr = String(fuenteHora).trim().replace('Z', '');
        const match = hStr.match(/\d{2}:\d{2}/);
        if (match) {
            horaFinal = match[0];
        } else if (hStr.toLowerCase().includes('m')) {
            horaFinal = hStr;
        }
    }

    return horaFinal ? `${fechaLimpia} - ${horaFinal}` : fechaLimpia;
}

function cargarNoticiasAdmin() {
    fetch(urlAPI)
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('lista-admin-body');
            // SEC-003: limpiar via textContent antes de poblar
            tbody.textContent = '';

            if (!Array.isArray(data)) return;

            const ultimasDos = data.slice(-2);

            ultimasDos.forEach(noticia => {
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
        })
        .catch(err => console.error("Error al cargar noticias admin:", err));
}

function prepararEdicion(noticia) {
    document.getElementById('noticia-id').value = noticia.id;
    document.getElementById('admin-titulo').value = noticia.titulo;
    document.getElementById('admin-imagen').value = noticia.imagen;
    document.getElementById('admin-categoria').value = (noticia.categoria || '').trim().toLowerCase();
    document.getElementById('admin-cuerpo').value = noticia.cuerpo;
    
    if (noticia.fecha) {
        const fechaStr = String(noticia.fecha).split('T')[0];
        document.getElementById('admin-fecha').value = fechaStr;
    }
    if (noticia.hora) {
        let horaStr = String(noticia.hora);
        if (horaStr.includes('T')) {
            const parteHora = horaStr.split('T')[1];
            horaStr = parteHora ? parteHora.substring(0, 5) : horaStr;
        }
        document.getElementById('admin-hora').value = horaStr;
    }

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

const urlAppsScriptMinutoUno = "https://script.google.com/macros/s/AKfycbySMz7KUr-PtZzk6fMTfvJqY1dQZk_c87qblUgbOPqOfJcNznb_3Czls-EDkH3hfn5B1g/exec";

let publicidadesLocales = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarPublicidades();

    const formAds = document.getElementById("form-admin-ads");
    const btnCancelar = document.getElementById("btn-cancelar-edicion");

    if (formAds) {
        formAds.addEventListener("submit", guardarPublicidad);
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener("click", resetFormulario);
    }
});

function cargarPublicidades() {
    const listContainer = document.getElementById("ads-list-container");
    const msg = document.getElementById("loading-msg");
    
    msg.style.display = "block";
    msg.textContent = "Cargando publicidades...";
    listContainer.innerHTML = "";

    fetch(urlAppsScriptMinutoUno)
        .then(response => response.json())
        .then(data => {
            msg.style.display = "none";
            if (data.publicidades && data.publicidades.length > 0) {
                publicidadesLocales = data.publicidades;
                data.publicidades.forEach((ad, index) => {
                    const item = document.createElement("div");
                    item.className = "ad-item";
                    
                    const titleSpan = document.createElement("span");
                    titleSpan.textContent = ad.titulo || "Sin título";
                    
                    const actionsDiv = document.createElement("div");
                    actionsDiv.className = "ad-actions";
                    
                    const btnEdit = document.createElement("button");
                    btnEdit.className = "btn-edit";
                    btnEdit.textContent = "✏️ Editar";
                    btnEdit.onclick = () => editarPublicidad(index);
                    
                    const btnDelete = document.createElement("button");
                    btnDelete.className = "btn-delete";
                    btnDelete.textContent = "❌ Eliminar";
                    btnDelete.onclick = () => eliminarPublicidad(ad.titulo);
                    
                    actionsDiv.appendChild(btnEdit);
                    actionsDiv.appendChild(btnDelete);
                    
                    item.appendChild(titleSpan);
                    item.appendChild(actionsDiv);
                    
                    listContainer.appendChild(item);
                });
            } else {
                listContainer.innerHTML = "<p>No hay publicidades activas en este momento.</p>";
            }
        })
        .catch(err => {
            console.error("Error al cargar publicidades:", err);
            msg.textContent = "Error al cargar publicidades. Revisa tu conexión.";
        });
}

function editarPublicidad(index) {
    const ad = publicidadesLocales[index];
    if (!ad) return;

    document.getElementById("ad-original-titulo").value = ad.titulo;
    document.getElementById("ad-titulo").value = ad.titulo;
    document.getElementById("ad-imagen").value = ad.imagen;
    document.getElementById("ad-texto").value = ad.texto || "";
    document.getElementById("ad-telefono").value = ad.telefono || "";
    document.getElementById("ad-email").value = ad.email || "";
    document.getElementById("ad-url").value = ad.url || "";

    document.getElementById("form-title").textContent = "Editar Publicidad";
    document.getElementById("btn-guardar-ad").textContent = "Actualizar Publicidad";
    document.getElementById("btn-cancelar-edicion").style.display = "block";
}

function resetFormulario() {
    document.getElementById("form-admin-ads").reset();
    document.getElementById("ad-original-titulo").value = "";
    document.getElementById("form-title").textContent = "Agregar Nueva Publicidad";
    document.getElementById("btn-guardar-ad").textContent = "Guardar Publicidad";
    document.getElementById("btn-cancelar-edicion").style.display = "none";
}

function eliminarPublicidad(titulo) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la publicidad "${titulo}"?`)) return;

    const btnMsg = document.getElementById("loading-msg");
    btnMsg.style.display = "block";
    btnMsg.textContent = "Eliminando publicidad...";

    const datos = {
        action: "delete_ad",
        titulo: titulo // Apps Script buscará por este título
    };

    const formData = new FormData();
    formData.append('payload', JSON.stringify(datos));

    fetch(urlAppsScriptMinutoUno, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.resultado === "success") {
            alert("Publicidad eliminada con éxito.");
            cargarPublicidades();
        } else {
            alert("Error al eliminar: " + (data.mensaje || ""));
            btnMsg.style.display = "none";
        }
    })
    .catch(err => {
        console.error("Error:", err);
        alert("Error de red al intentar eliminar.");
        btnMsg.style.display = "none";
    });
}

function guardarPublicidad(e) {
    e.preventDefault();
    
    const originalTitulo = document.getElementById("ad-original-titulo").value;
    const isEdit = originalTitulo !== "";

    const btnGuardar = document.getElementById('btn-guardar-ad');
    const textoBoton = btnGuardar.textContent;
    btnGuardar.textContent = 'Procesando...';
    btnGuardar.disabled = true;

    const datos = {
        action: isEdit ? "edit_ad" : "add_ad",
        tituloOriginal: originalTitulo,
        titulo: document.getElementById('ad-titulo').value,
        imagen: document.getElementById('ad-imagen').value,
        texto: document.getElementById('ad-texto').value,
        telefono: document.getElementById('ad-telefono').value,
        email: document.getElementById('ad-email').value,
        url: document.getElementById('ad-url').value
    };

    const formData = new FormData();
    formData.append('payload', JSON.stringify(datos));

    fetch(urlAppsScriptMinutoUno, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        btnGuardar.textContent = textoBoton;
        btnGuardar.disabled = false;
        if (data.resultado === "success") {
            alert(isEdit ? "Publicidad actualizada con éxito." : "Publicidad añadida con éxito.");
            resetFormulario();
            cargarPublicidades();
            
            // Si la ventana principal existe, notificarle que debe recargar (opcional)
            if (window.opener && !window.opener.closed) {
                if(typeof window.opener.cargarDatosSecundarios === "function") {
                    window.opener.cargarDatosSecundarios();
                }
            }
        } else {
            alert("Hubo un error al procesar la solicitud: " + (data.mensaje || ""));
        }
    })
    .catch(err => {
        console.error("Error guardando ad:", err);
        btnGuardar.textContent = textoBoton;
        btnGuardar.disabled = false;
        alert("Error de red al intentar guardar la publicidad.");
    });
}

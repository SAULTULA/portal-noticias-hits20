const urlAppsScriptMinutoUno = "https://script.google.com/macros/s/AKfycbySMz7KUr-PtZzk6fMTfvJqY1dQZk_c87qblUgbOPqOfJcNznb_3Czls-EDkH3hfn5B1g/exec";

const ADMIN_USER = "admin";
const ADMIN_PASS = "radio2026";

let publicidadesLocales = [];

document.addEventListener("DOMContentLoaded", () => {
    // ── LÓGICA DE LOGIN ──
    const loginScreen = document.getElementById("login-screen");
    const mainPanel   = document.getElementById("main-panel");
    const btnLogin    = document.getElementById("btn-login");
    const loginError  = document.getElementById("login-error");
    const loginPass   = document.getElementById("login-pass");

    // Si ya inició sesión en esta pestaña, mostrar panel directamente
    if (sessionStorage.getItem("ads_auth") === "true") {
        loginScreen.style.display = "none";
        mainPanel.style.display = "block";
        inicializarPanel();
    }

    // Enter en el campo contraseña también inicia sesión
    loginPass.addEventListener("keydown", e => {
        if (e.key === "Enter") btnLogin.click();
    });

    btnLogin.addEventListener("click", () => {
        const user = document.getElementById("login-user").value.trim();
        const pass = document.getElementById("login-pass").value;

        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            sessionStorage.setItem("ads_auth", "true");
            loginScreen.style.display = "none";
            mainPanel.style.display = "block";
            inicializarPanel();
        } else {
            loginError.style.display = "block";
            document.getElementById("login-pass").value = "";
        }
    });

    // Si NO está autenticado, no llamar a inicializarPanel
    if (sessionStorage.getItem("ads_auth") !== "true") return;
});

function inicializarPanel() {
    cargarPublicidades();

    const formAds     = document.getElementById("form-admin-ads");
    const btnCancelar = document.getElementById("btn-cancelar-edicion");

    if (formAds)     formAds.addEventListener("submit", guardarPublicidad);
    if (btnCancelar) btnCancelar.addEventListener("click", resetFormulario);

    // ── TOGGLE URL / ARCHIVO ──
    const btnModoUrl     = document.getElementById("btn-modo-url");
    const btnModoArchivo = document.getElementById("btn-modo-archivo");
    const panelUrl       = document.getElementById("panel-url");
    const panelArchivo   = document.getElementById("panel-archivo");
    const imgPreview     = document.getElementById("img-preview");
    const inputUrl       = document.getElementById("ad-imagen");
    const inputFile      = document.getElementById("ad-imagen-file");

    btnModoUrl.addEventListener("click", () => {
        btnModoUrl.classList.add("active");
        btnModoArchivo.classList.remove("active");
        panelUrl.style.display = "block";
        panelArchivo.style.display = "none";
    });

    btnModoArchivo.addEventListener("click", () => {
        btnModoArchivo.classList.add("active");
        btnModoUrl.classList.remove("active");
        panelUrl.style.display = "none";
        panelArchivo.style.display = "block";
    });

    // Preview en tiempo real al escribir URL
    inputUrl.addEventListener("input", () => {
        const val = inputUrl.value.trim();
        if (val) {
            imgPreview.src = val;
            imgPreview.style.display = "block";
        } else {
            imgPreview.style.display = "none";
        }
    });

    // Preview al seleccionar archivo
    inputFile.addEventListener("change", () => {
        const file = inputFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            imgPreview.src = e.target.result;
            imgPreview.style.display = "block";
        };
        reader.readAsDataURL(file);
    });
}


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

async function guardarPublicidad(e) {
    e.preventDefault();
    
    const originalTitulo = document.getElementById("ad-original-titulo").value;
    const isEdit = originalTitulo !== "";

    const btnGuardar = document.getElementById('btn-guardar-ad');
    const textoBoton = btnGuardar.textContent;
    btnGuardar.textContent = 'Procesando...';
    btnGuardar.disabled = true;

    // ── Resolver la imagen: URL externa o archivo local ──
    let imagenFinal = document.getElementById('ad-imagen').value.trim();

    const modoArchivo = document.getElementById("btn-modo-archivo").classList.contains("active");
    const fileInput   = document.getElementById("ad-imagen-file");

    if (modoArchivo && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const progress = document.getElementById("upload-progress");
        progress.style.display = "block";
        btnGuardar.textContent = 'Subiendo imagen...';
        try {
            imagenFinal = await subirImagenADrive(file);
        } catch (err) {
            progress.style.display = "none";
            btnGuardar.textContent = textoBoton;
            btnGuardar.disabled = false;
            alert("Error al subir la imagen: " + err.message);
            return;
        }
        progress.style.display = "none";
    }

    if (!imagenFinal) {
        alert("Por favor ingresá una URL de imagen o seleccioná un archivo.");
        btnGuardar.textContent = textoBoton;
        btnGuardar.disabled = false;
        return;
    }

    btnGuardar.textContent = 'Guardando...';

    const datos = {
        action: isEdit ? "edit_ad" : "add_ad",
        tituloOriginal: originalTitulo,
        titulo: document.getElementById('ad-titulo').value,
        imagen: imagenFinal,
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
            if (window.opener && !window.opener.closed) {
                if (typeof window.opener.cargarDatosSecundarios === "function") {
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

// Convierte un File a base64 y lo sube a Google Drive vía Apps Script
function subirImagenADrive(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const base64Data = ev.target.result.split(",")[1]; // quitar el prefijo data:image/...;base64,
                const payload = {
                    action: "upload_image",
                    filename: file.name,
                    mimeType: file.type,
                    base64: base64Data
                };
                const formData = new FormData();
                formData.append('payload', JSON.stringify(payload));

                const res = await fetch(urlAppsScriptMinutoUno, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.resultado === "success" && data.url) {
                    resolve(data.url);
                } else {
                    reject(new Error(data.mensaje || "Error desconocido al subir la imagen."));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
        reader.readAsDataURL(file);
    });
}

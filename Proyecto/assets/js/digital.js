"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const URL_BACKEND = "config/conexion_digital.php";
    const URL_AUTENTICACION = "config/autenticacion.php";
    const rolUsuario = localStorage.getItem("usuario_rol") || "usuario";

    // --- 1. GESTIÓN DE PERFIL Y CONEXIÓN CON AUTENTICACIÓN ---
    const modalPerfil = document.getElementById("modalPerfil");
    const btnAbrirPerfil = document.getElementById("btnAbrirPerfil");
    const btnCerrarPerfil = document.getElementById("btnCerrarPerfil");
    const avatarMini = document.getElementById("avatarMini");
    const avatarModal = document.getElementById("avatarModal");
    const nombreUsuarioTop = document.getElementById("nombreUsuarioTop");
    const perfilRol = document.getElementById("perfilRol");
    const perfilCorreo = document.getElementById("perfilCorreo");
    const inputCambiarFoto = document.getElementById("inputCambiarFoto");
    const inputEditarNombre = document.getElementById("inputEditarNombre");
    const btnGuardarPerfil = document.getElementById("btnGuardarPerfil");

    let nuevaFotoBase64 = null;

    async function cargarDatosPerfil() {
        try {
            const formData = new FormData();
            formData.append("accion", "obtener_perfil");
            const res = await fetch(URL_AUTENTICACION, { method: "POST", body: formData });
            const data = await res.json();

            if (data.status === "success" && data.data) {
                const u = data.data;
                localStorage.setItem("usuario_nombre", u.nombre);
                localStorage.setItem("usuario_rol", u.rol);
                if (u.foto) localStorage.setItem("usuario_foto", u.foto);

                if (nombreUsuarioTop) nombreUsuarioTop.textContent = u.nombre;
                if (inputEditarNombre) inputEditarNombre.value = u.nombre;
                if (perfilRol) perfilRol.textContent = u.rol === "admin" ? "Administrador" : "Común";
                if (perfilCorreo) perfilCorreo.textContent = u.correo;
                
                const fotoFinal = u.foto || "https://via.placeholder.com/150";
                if (avatarMini) avatarMini.src = fotoFinal;
                if (avatarModal) avatarModal.src = fotoFinal;
            }
        } catch (e) {
            console.error("Error al sincronizar perfil:", e);
        }
    }

    cargarDatosPerfil();

    if (btnAbrirPerfil && modalPerfil) {
        btnAbrirPerfil.addEventListener("click", () => {
            if (typeof modalPerfil.showModal === "function") modalPerfil.showModal();
        });
    }

    if (btnCerrarPerfil && modalPerfil) {
        btnCerrarPerfil.addEventListener("click", () => modalPerfil.close());
    }

    if (inputCambiarFoto) {
        inputCambiarFoto.addEventListener("change", (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                const lector = new FileReader();
                lector.onload = function(event) {
                    nuevaFotoBase64 = event.target.result;
                    if (avatarModal) avatarModal.src = nuevaFotoBase64;
                };
                lector.readAsDataURL(archivo);
            }
        });
    }

    if (btnGuardarPerfil) {
        btnGuardarPerfil.addEventListener("click", async () => {
            const formData = new FormData();
            formData.append("accion", "actualizar_perfil");
            formData.append("nombre", inputEditarNombre ? inputEditarNombre.value : "");
            if (nuevaFotoBase64) formData.append("foto", nuevaFotoBase64);

            try {
                const res = await fetch(URL_AUTENTICACION, { method: "POST", body: formData });
                const data = await res.json();

                if (data.status === "success") {
                    alert("¡Perfil actualizado con éxito!");
                    modalPerfil.close();
                    cargarDatosPerfil();
                } else {
                    alert(data.message || "Error al actualizar el perfil.");
                }
            } catch (error) {
                console.error("Error al guardar perfil:", error);
            }
        });
    }

    // --- 2. MODALES Y LÓGICA DE INVENTARIO DIGITAL ---
    const modalAgregar = document.getElementById("modalAgregar");
    const btnAbrirModalAgregar = document.getElementById("btnAbrirModalAgregar");
    const btnCerrarModalAgregar = document.getElementById("btnCerrarModalAgregar");
    const contenedorBtnAgregar = document.getElementById("contenedorBtnAgregar");

    const formCrear = document.getElementById("formCrear");
    const tablaUsuarios = document.getElementById("tablaUsuarios");

    const modalEditar = document.getElementById("modalEditar");
    const formEditar = document.getElementById("formEditar");
    const btnCerrarEditar = document.getElementById("btnCerrarEditar");

    const modalEliminar = document.getElementById("modalEliminar");
    const btnCancelarEliminar = document.getElementById("btnCancelarEliminar");
    const btnConfirmarEliminar = document.getElementById("btnConfirmarEliminar");

    let idParaEliminar = null;

    if (rolUsuario !== "admin") {
        if (contenedorBtnAgregar) contenedorBtnAgregar.style.display = "none";
    } else {
        if (btnAbrirModalAgregar && modalAgregar) {
            btnAbrirModalAgregar.addEventListener("click", () => modalAgregar.showModal());
        }
        if (btnCerrarModalAgregar && modalAgregar) {
            btnCerrarModalAgregar.addEventListener("click", () => modalAgregar.close());
        }
    }

    // --- 3. GESTIÓN DINÁMICA DE LINKS (CREAR) ---
    const checkboxesPlataforma = document.querySelectorAll(".check-plataforma");
    const contenedorDinamicoLinks = document.getElementById("contenedorDinamicoLinks");

    function actualizarCamposLinks(checkboxes, contenedor) {
        if (!contenedor) return;
        contenedor.innerHTML = "";
        const marcadas = Array.from(checkboxes).filter(chk => chk.checked);
        
        if (marcadas.length === 0) {
            contenedor.innerHTML = "<p style='color: #666; font-size: 0.9em;'>Selecciona al menos una plataforma.</p>";
            return;
        }

        const esOtro = marcadas.some(chk => chk.value === "Otro");
        if (esOtro) {
            contenedor.innerHTML = `
                <label style="font-weight: bold; color: #d9534f;">Indica cuántos enlaces deseas (1 a 5):</label>
                <input type="number" class="numLinksOtro" min="1" max="5" value="1" style="width: 60px; margin-left: 10px; padding: 4px;"><br><br>
                <div class="subContenedorOtro"></div>
            `;
            const inputNum = contenedor.querySelector(".numLinksOtro");
            const subContenedor = contenedor.querySelector(".subContenedorOtro");

            function renderizarInputsOtro(cantidad) {
                subContenedor.innerHTML = "";
                for (let i = 0; i < cantidad; i++) {
                    subContenedor.innerHTML += `
                        <div style="margin-bottom: 8px;">
                            <label>Enlace ${i + 1}:</label>
                            <input type="url" name="links[]" placeholder="https://ejemplo.com" required style="width: 100%; padding: 6px; box-sizing: border-box;">
                        </div>
                    `;
                }
            }
            renderizarInputsOtro(parseInt(inputNum.value) || 1);
            inputNum.addEventListener("input", (e) => {
                let val = parseInt(e.target.value) || 1;
                if (val < 1) val = 1; if (val > 5) val = 5;
                e.target.value = val;
                renderizarInputsOtro(val);
            });
        } else {
            let htmlInputs = `<label style="font-weight: bold;">Ingresa el enlace para cada plataforma:</label><br><br>`;
            marcadas.forEach((chk) => {
                let placeholderEj = "https://ejemplo.com";
                if (chk.value === "Steam") placeholderEj = "https://store.steampowered.com/...";
                if (chk.value === "eShop") placeholderEj = "https://www.nintendo.com/...";
                if (chk.value === "Xbox") placeholderEj = "https://www.xbox.com/...";
                if (chk.value === "PlayStation Store") placeholderEj = "https://store.playstation.com/...";

                htmlInputs += `
                    <div style="margin-bottom: 8px;">
                        <label>Enlace para <b>${chk.value}</b>:</label>
                        <input type="url" name="links[]" placeholder="${placeholderEj}" required style="width: 100%; padding: 6px; box-sizing: border-box;">
                    </div>
                `;
            });
            contenedor.innerHTML = htmlInputs;
        }
    }

    checkboxesPlataforma.forEach(chk => {
        chk.addEventListener("change", () => actualizarCamposLinks(checkboxesPlataforma, contenedorDinamicoLinks));
    });

    // --- 4. VALIDACIÓN ESTRICTA DE DOMINIOS OFICIALES ---
    function validarDominiosCliente(checkboxes) {
        const inputsLinks = document.querySelectorAll('input[name="links[]"]');
        const marcadas = Array.from(checkboxes).filter(chk => chk.checked && chk.value !== "Otro");

        for (let i = 0; i < inputsLinks.length; i++) {
            let url = inputsLinks[i].value.trim().toLowerCase();
            if (!url) continue;

            if (marcadas[i]) {
                let plataforma = marcadas[i].value.toLowerCase();
                let valido = false;

                if (plataforma.includes("steam") && (url.includes("store.steampowered.com") || url.includes("steamcommunity.com"))) {
                    valido = true;
                } else if (plataforma.includes("eshop") && (url.includes("nintendo.com") || url.includes("nintendo.es"))) {
                    valido = true;
                } else if (plataforma.includes("xbox") && url.includes("xbox.com")) {
                    valido = true;
                } else if (plataforma.includes("playstation") && url.includes("playstation.com")) {
                    valido = true;
                }

                if (!valido) {
                    alert(`El enlace para ${marcadas[i].value} debe pertenecer estrictamente a su página web oficial.`);
                    inputsLinks[i].focus();
                    return false;
                }
            }
        }
        return true;
    }

    // --- 5. CARGAR Y LISTAR REGISTROS ---
    async function cargarUsuarios() {
        const formData = new FormData();
        formData.append("accion", "listar");

        try {
            const res = await fetch(URL_BACKEND, { method: "POST", body: formData });
            const data = await res.json();
            if (tablaUsuarios) tablaUsuarios.innerHTML = "";

            if (data.status === "success" && data.data) {
                data.data.forEach(user => {
                    const tr = document.createElement("tr");
                    let htmlImagen = user.imagen 
                        ? `<img src="${user.imagen}" alt="Portada" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer;" title="Clic para ampliar">` 
                        : "Sin imagen";

                    let accionesHtml = "";
                    if (rolUsuario === "admin") {
                        accionesHtml = `
                            <td><a href="#" class="btn-editar" data-id="${user.id}">Editar</a></td>
                            <td><a href="#" class="btn-eliminar" data-id="${user.id}">Eliminar</a></td>
                        `;
                    } else {
                        const linksStr = encodeURIComponent(JSON.stringify(user.links || []));
                        accionesHtml = `
                            <td colspan="2" style="text-align: center;">
                                <button class="btn-links" data-nombre="${user.nombre}" data-links="${linksStr}" style="background-color: #17a2b8; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Links</button>
                            </td>
                        `;
                    }

                    tr.innerHTML = `
                        <td>${htmlImagen}</td>
                        <td>${user.nombre}</td>
                        <td>${user.genero || '-'}</td>
                        <td>${user.idioma}</td>
                        <td>${user.clasificacion_edad}</td>
                        <td>${user.plataforma}</td>
                        <td>${Number(user.calificacion_actual).toFixed(1)}</td>
                        <td>$${Number(user.precio).toFixed(2)}</td>
                        ${accionesHtml}
                    `;
                    tablaUsuarios.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Error al cargar la tabla digital:", error);
        }
    }

    if (tablaUsuarios) {
        tablaUsuarios.addEventListener("click", (e) => {
            if (e.target.classList.contains("btn-editar")) {
                e.preventDefault();
                abrirModalEditar(e.target.getAttribute("data-id"));
            } else if (e.target.classList.contains("btn-eliminar")) {
                e.preventDefault();
                abrirModalEliminar(e.target.getAttribute("data-id"));
            } else if (e.target.classList.contains("btn-links")) {
                e.preventDefault();
                abrirModalLinks(e.target.getAttribute("data-nombre"), JSON.parse(decodeURIComponent(e.target.getAttribute("data-links"))));
            } else if (e.target.tagName === "IMG" && e.target.getAttribute("alt") === "Portada") {
                e.preventDefault();
                abrirModalImagen(e.target.getAttribute("src"));
            }
        });
    }

    // --- 6. MODALES AUXILIARES ---
    function abrirModalLinks(nombreJuego, links) {
        const modalLinks = document.getElementById("modalLinks");
        const contenidoLinks = document.getElementById("contenidoLinks");
        let htmlLinks = `<h3>Enlaces: ${nombreJuego}</h3><hr>`;
        if (links && links.length > 0) {
            htmlLinks += `<ul style="list-style: none; padding: 0;">`;
            links.forEach((link, i) => htmlLinks += `<li style="margin: 10px 0;"><a href="${link}" target="_blank" style="color: #007bff;">🔗 Enlace ${i + 1}: ${link}</a></li>`);
            htmlLinks += `</ul>`;
        } else {
            htmlLinks += `<p style="color: #666;">No hay enlaces registrados.</p>`;
        }
        if (contenidoLinks) contenidoLinks.innerHTML = htmlLinks;
        if (modalLinks) modalLinks.showModal();
    }

    const btnCerrarLinks = document.getElementById("btnCerrarLinks");
    if (btnCerrarLinks) btnCerrarLinks.addEventListener("click", () => document.getElementById("modalLinks").close());

    function abrirModalImagen(src) {
        const modalImagen = document.getElementById("modalImagen");
        const contenedorImagenZoom = document.getElementById("contenedorImagenZoom");
        if (modalImagen && contenedorImagenZoom) {
            contenedorImagenZoom.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 4px;">`;
            modalImagen.showModal();
        }
    }
    const btnCerrarImg = document.getElementById("btnCerrarImg");
    if (btnCerrarImg) btnCerrarImg.addEventListener("click", () => document.getElementById("modalImagen").close());

    // --- 7. CREAR REGISTRO DIGITAL ---
    if (formCrear && rolUsuario === "admin") {
        formCrear.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!validarDominiosCliente(checkboxesPlataforma)) return;

            const res = await fetch(URL_BACKEND, { method: "POST", body: new FormData(formCrear) });
            const data = await res.json();
            if (data.status === "success") {
                formCrear.reset();
                actualizarCamposLinks(checkboxesPlataforma, contenedorDinamicoLinks);
                if (modalAgregar) modalAgregar.close();
                cargarUsuarios();
            } else {
                alert(data.message || "Error al crear");
            }
        });
    }

    // --- 8. EDITAR REGISTRO DIGITAL (CON CHECKBOXES Y LINKS) ---
    const checkboxesPlataformaEdit = document.querySelectorAll(".check-plataforma-edit");
    const contenedorDinamicoLinksEditar = document.getElementById("contenedorDinamicoLinksEditar");

    checkboxesPlataformaEdit.forEach(chk => {
        chk.addEventListener("change", () => actualizarCamposLinks(checkboxesPlataformaEdit, contenedorDinamicoLinksEditar));
    });

    async function abrirModalEditar(id) {
        const formData = new FormData();
        formData.append("accion", "obtener");
        formData.append("id", id);
        const res = await fetch(URL_BACKEND, { method: "POST", body: formData });
        const data = await res.json();

        if (data.status === "success") {
            const user = data.data;
            document.getElementById("editUsuarioId").value = user.id;
            document.getElementById("editNombre").value = user.nombre;
            if (document.getElementById("editGenero")) document.getElementById("editGenero").value = user.genero || "";
            document.getElementById("editIdioma").value = user.idioma;
            document.getElementById("editClasificacion").value = user.clasificacion_edad;
            document.getElementById("editCalificacion").value = user.calificacion_actual;
            document.getElementById("editPrecio").value = user.precio;

            // Limpiar y poblar los enlaces existentes al editar
            checkboxesPlataformaEdit.forEach(chk => chk.checked = false);
            if (contenedorDinamicoLinksEditar && user.links) {
                let htmlEditLinks = `<label style="font-weight: bold;">Enlaces actuales / Modificar:</label><br><br>`;
                user.links.forEach((link, idx) => {
                    htmlEditLinks += `
                        <div style="margin-bottom: 8px;">
                            <label>Enlace ${idx + 1}:</label>
                            <input type="url" name="links[]" value="${link}" required style="width: 100%; padding: 6px; box-sizing: border-box;">
                        </div>
                    `;
                });
                contenedorDinamicoLinksEditar.innerHTML = htmlEditLinks;
            }

            modalEditar.showModal();
        }
    }

    if (formEditar && rolUsuario === "admin") {
        formEditar.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!validarDominiosCliente(checkboxesPlataformaEdit)) return;

            const res = await fetch(URL_BACKEND, { method: "POST", body: new FormData(formEditar) });
            const data = await res.json();
            if (data.status === "success") {
                modalEditar.close();
                cargarUsuarios();
            } else {
                alert(data.message || "Error al actualizar");
            }
        });
    }
    if (btnCerrarEditar) btnCerrarEditar.addEventListener("click", () => modalEditar.close());

    // --- 9. ELIMINAR REGISTRO DIGITAL ---
    function abrirModalEliminar(id) {
        idParaEliminar = id;
        modalEliminar.showModal();
    }
    if (btnCancelarEliminar) btnCancelarEliminar.addEventListener("click", () => { idParaEliminar = null; modalEliminar.close(); });
    if (btnConfirmarEliminar && rolUsuario === "admin") {
        btnConfirmarEliminar.addEventListener("click", async () => {
            if (!idParaEliminar) return;
            const formData = new FormData();
            formData.append("accion", "eliminar");
            formData.append("id", idParaEliminar);
            const res = await fetch(URL_BACKEND, { method: "POST", body: formData });
            const data = await res.json();
            if (data.status === "success") {
                modalEliminar.close();
                idParaEliminar = null;
                cargarUsuarios();
            } else {
                alert(data.message || "Error al eliminar");
            }
        });
    }

    cargarUsuarios();
});
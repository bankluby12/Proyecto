"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const URL_BACKEND = "config/conexion.php";
    const URL_AUTENTICACION = "/Proyecto/config/autenticacion.php";
    const rolUsuario = localStorage.getItem("usuario_rol") || "usuario";

    // --- GESTIÓN DE PERFIL Y CONEXIÓN CON autenticacion.php ---
    const modalPerfil = document.getElementById("modalPerfil");
    const btnAbrirPerfil = document.getElementById("btnAbrirPerfil");
    const btnCerrarPerfil = document.getElementById("btnCerrarPerfil");
    const avatarMini = document.getElementById("avatarMini");
    const avatarModal = document.getElementById("avatarModal");
    const nombreUsuarioTop = document.getElementById("nombreUsuarioTop");
    const perfilNombre = document.getElementById("perfilNombre");
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
                if (perfilNombre) perfilNombre.textContent = u.nombre;
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
            if (typeof modalPerfil.showModal === "function") {
                modalPerfil.showModal();
            } else {
                modalPerfil.style.display = "block";
            }
        });
    }

    if (btnCerrarPerfil && modalPerfil) {
        btnCerrarPerfil.addEventListener("click", () => {
            if (typeof modalPerfil.close === "function") {
                modalPerfil.close();
            } else {
                modalPerfil.style.display = "none";
            }
        });
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
            if (nuevaFotoBase64) {
                formData.append("foto", nuevaFotoBase64);
            }

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

    // --- MODALES Y LÓGICA DE INVENTARIO FÍSICO ---
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

    /* 1. LISTAR REGISTROS */
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
                        ? `<img src="${user.imagen}" alt="Portada" width="60" height="60" style="object-fit: cover; border-radius: 4px; cursor: pointer;" title="Clic para ampliar">` 
                        : "Sin imagen";

                    let accionesHtml = "";
                    if (rolUsuario === "admin") {
                        accionesHtml = `
                            <td><a href="#" class="btn-editar" data-id="${user.id}">Editar</a></td>
                            <td><a href="#" class="btn-eliminar" data-id="${user.id}">Eliminar</a></td>
                        `;
                    } else {
                        accionesHtml = `
                            <td colspan="2" style="text-align: center;">
                                <button class="btn-comprar" data-id="${user.id}" data-nombre="${user.nombre}" data-precio="${user.precio}" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Comprar</button>
                            </td>
                        `;
                    }

                    tr.innerHTML = `
                        <td>${htmlImagen}</td>
                        <td>${user.nombre}</td>
                        <td>${user.genero || '-'}</td>
                        <td>${user.idioma}</td>
                        <td>${user.clasificacion_edad}</td>
                        <td>${user.tipo_formato}</td>
                        <td>${user.estado}</td>
                        <td>${user.stock}</td>
                        <td>$${Number(user.precio).toFixed(2)}</td>
                        ${accionesHtml}
                    `;
                    tablaUsuarios.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Error al cargar la tabla física:", error);
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
            } else if (e.target.classList.contains("btn-comprar")) {
                e.preventDefault();
                const nombre = e.target.getAttribute("data-nombre");
                const precio = e.target.getAttribute("data-precio");
                alert(`¡Gracias por tu compra!\n\nHas seleccionado: ${nombre}\nPrecio: $${Number(precio).toFixed(2)}`);
            } else if (e.target.tagName === "IMG" && e.target.getAttribute("alt") === "Portada") {
                e.preventDefault();
                const modalImagen = document.getElementById("modalImagen");
                const contenedorImagenZoom = document.getElementById("contenedorImagenZoom");
                if (modalImagen && contenedorImagenZoom) {
                    contenedorImagenZoom.innerHTML = `<img src="${e.target.getAttribute("src")}" style="max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 4px;">`;
                    modalImagen.showModal();
                }
            }
        });
    }

    const btnCerrarImg = document.getElementById("btnCerrarImg");
    if (btnCerrarImg) {
        btnCerrarImg.addEventListener("click", () => {
            const modalImagen = document.getElementById("modalImagen");
            if (modalImagen) modalImagen.close();
        });
    }

    /* 2. CREAR */
    if (formCrear && rolUsuario === "admin") {
        formCrear.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const precioVal = parseFloat(formCrear.querySelector('input[name="precio"]').value);
            if (precioVal >= 1500) {
                alert("El precio no puede alcanzar o superar los 1500.");
                return;
            }

            const formData = new FormData(formCrear);
            const res = await fetch(URL_BACKEND, { method: "POST", body: formData });
            const data = await res.json();

            if (data.status === "success") {
                formCrear.reset();
                if (modalAgregar) modalAgregar.close();
                cargarUsuarios();
            } else {
                alert(data.message || "Error al crear");
            }
        });
    }

    /* 3. EDITAR */
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
            if (document.getElementById("editGenero")) {
                document.getElementById("editGenero").value = user.genero || "";
            }
            document.getElementById("editIdioma").value = user.idioma;
            document.getElementById("editClasificacion").value = user.clasificacion_edad;
            document.getElementById("editFormato").value = user.tipo_formato;
            document.getElementById("editEstado").value = user.estado;
            document.getElementById("editStock").value = user.stock;
            document.getElementById("editPrecio").value = user.precio;

            modalEditar.showModal();
        }
    }

    if (formEditar && rolUsuario === "admin") {
        formEditar.addEventListener("submit", async (e) => {
            e.preventDefault();

            const precioVal = parseFloat(formEditar.querySelector('input[name="precio"]').value);
            if (precioVal >= 1500) {
                alert("El precio no puede alcanzar o superar los 1500.");
                return;
            }

            const formData = new FormData(formEditar);
            const res = await fetch(URL_BACKEND, { method: "POST", body: formData });
            const data = await res.json();

            if (data.status === "success") {
                modalEditar.close();
                cargarUsuarios();
            } else {
                alert(data.message || "Error al actualizar");
            }
        });
    }

    if (btnCerrarEditar) {
        btnCerrarEditar.addEventListener("click", () => modalEditar.close());
    }

    /* 4. ELIMINAR */
    function abrirModalEliminar(id) {
        idParaEliminar = id;
        modalEliminar.showModal();
    }

    if (btnCancelarEliminar) {
        btnCancelarEliminar.addEventListener("click", () => {
            idParaEliminar = null;
            modalEliminar.close();
        });
    }

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
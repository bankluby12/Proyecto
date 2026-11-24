"use strict";

/* Elementos globales y UI */
const formLogin = document.getElementById("formLogin");
const formRegistro = document.getElementById("formRegistro");
const formActivo = formLogin || formRegistro; // Detecta qué formulario existe en la vista actual

const btnEnviar = document.getElementById("btnEnviarLogin") || document.getElementById("btnEnviarRegistro");
const mensajeGlobal = document.getElementById("mensajeGlobal");
const loading = document.getElementById("loading");
const gifEntradaTv = document.getElementById("gifEntradaTv");

const DURACION_GIF_MS = 3000; // Ajusta este tiempo (en milisegundos) a la duración de tu GIF
let mensajeTimeout;

/* Ocultar el GIF de entrada al terminar su reproducción al entrar a la página */
if (gifEntradaTv) {
    setTimeout(() => {
        gifEntradaTv.classList.add("oculto");
    }, DURACION_GIF_MS);
}

/* Mapeo dinámico de inputs del formulario activo */
const inputs = {};
if (formActivo) {
    const elementosInput = formActivo.querySelectorAll("input[name]");
    elementosInput.forEach(input => {
        inputs[input.name] = input;
    });
}

/* Utilidades */
function mostrarError(campo, mensaje) {
    const error = formActivo.querySelector(`small[id*="${campo}"]`);
    if (error) error.textContent = mensaje;
}

function limpiarErrores() {
    if (formActivo) {
        formActivo.querySelectorAll(".error").forEach(elemento => elemento.textContent = "");
    }
    if (mensajeGlobal) mensajeGlobal.textContent = "";
}

/* Validaciones con Regex */
function validarNombre(v) {
    const regex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
    return regex.test(v) && v.length >= 3 && v.length <= 30 && !/\s{2,}/.test(v);
}

function validarCorreo(v) {
    const regex = /^[a-zA-Z0-9._]+@[a-zA-Z]+\.[a-zA-Z]{2,}$/;
    return regex.test(v) && v.length >= 5 && v.length <= 30 && !/\s{2,}/.test(v);
}

function validarPassword(v) {
    const regexMayuscula = /[A-Z]/;
    const regexEspecial = /[!@#$%^&*(),.?":{}|<>_\-\+=]/;

    if (v.length < 6 || v.length > 50) return false;
    if (!regexMayuscula.test(v)) return false;
    if (!regexEspecial.test(v)) return false;

    return true;
}

/* Validación en tiempo real */
function validarCampo(campo) {
    const input = inputs[campo];
    if (!input) return;

    const v = input.value.trim();

    switch (campo) {
        case "nombre":
            if (!v) mostrarError("nombre", "El nombre es obligatorio.");
            else if (!validarNombre(v)) mostrarError("nombre", "Solo letras (3 a 30 caracteres).");
            else mostrarError("nombre", "");
            break;

        case "correo":
            if (!v) mostrarError("correo", "El correo es obligatorio.");
            else if (!validarCorreo(v)) mostrarError("correo", "Correo inválido (5 a 30 caracteres).");
            else mostrarError("correo", "");
            break;

        case "password":
            if (!v) mostrarError("password", "La contraseña es obligatoria.");
            else if (!validarPassword(v)) mostrarError("password", "Mínimo 6 caracteres, una mayúscula y un carácter especial.");
            else mostrarError("password", "");
            break;
    }
}

/* Escuchar evento input para validación en tiempo real */
Object.keys(inputs).forEach(campo => {
    inputs[campo].addEventListener("input", () => validarCampo(campo));
});

/* Validación global previa al envío */
function validarFormulario() {
    let valido = true;

    if (inputs.nombre) {
        const nombre = inputs.nombre.value.trim();
        if (!nombre || !validarNombre(nombre)) {
            mostrarError("nombre", "Nombre inválido.");
            valido = false;
        }
    }

    if (inputs.correo) {
        const correo = inputs.correo.value.trim();
        if (!correo || !validarCorreo(correo)) {
            mostrarError("correo", "Correo inválido.");
            valido = false;
        }
    }

    if (inputs.password) {
        const password = inputs.password.value.trim();
        if (!password || !validarPassword(password)) {
            mostrarError("password", "Contraseña inválida (requiere mayúscula y carácter especial).");
            valido = false;
        }
    }

    return valido;
}

/* Notificación visual con temporizador */
function mostrarMensajeGlobal(texto, tipo) {
    if (!mensajeGlobal) return;

    mensajeGlobal.textContent = texto;
    mensajeGlobal.style.color = tipo === "success" ? "#28a745" : "#dc3545";

    clearTimeout(mensajeTimeout);
    mensajeTimeout = setTimeout(() => {
        mensajeGlobal.textContent = "";
        mensajeGlobal.style.color = "";
    }, 3000);
}

/* Procesamiento asíncrono del Submit */
if (formActivo) {
    formActivo.addEventListener("submit", async (e) => {
        e.preventDefault();

        limpiarErrores();

        if (!validarFormulario()) {
            mostrarMensajeGlobal("Revisa los campos del formulario.", "error");
            return;
        }

        if (loading) loading.style.display = "block";
        if (btnEnviar) btnEnviar.disabled = true;

        try {
            const formData = new FormData(formActivo);

            // Indicar al backend el tipo de acción a ejecutar
            const tipoAccion = formLogin ? "login" : "registro";
            formData.append("accion", tipoAccion);

            const response = await fetch("config/autenticacion.php", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (loading) loading.style.display = "none";
            if (btnEnviar) btnEnviar.disabled = false;

            if (data.status === "success") {
                mostrarMensajeGlobal(data.message || "Operación exitosa.", "success");

                // Guardar el rol del usuario en localStorage para restringir permisos en los inventarios
                if (data.rol) {
                    localStorage.setItem("usuario_rol", data.rol);
                }

                formActivo.reset();

                setTimeout(() => {
                    if (formLogin) {
                        // Abre el modal de selección de inventarios integrado en el HTML
                        const modal = document.getElementById("modalSeleccionInventario");
                        if (modal) {
                            modal.showModal();
                        } else {
                            window.location.href = "digital.html"; // Fallback por seguridad
                        }
                    } else {
                        window.location.href = "index.html"; // Redirección para el registro
                    }
                }, 1000);
            } else {
                mostrarMensajeGlobal(data.message || "Ocurrió un error.", "error");
            }
        } catch (error) {
            if (loading) loading.style.display = "none";
            if (btnEnviar) btnEnviar.disabled = false;

            mostrarMensajeGlobal("Error de conexión con el servidor.", "error");
        }
    });
}
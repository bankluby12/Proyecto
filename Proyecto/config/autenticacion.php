<?php 
session_start();
header("Content-Type: application/json; charset=UTF-8");

// Desactivar despliegue de errores en pantalla para mantener respuestas JSON limpias
ini_set('display_errors', 0);
error_reporting(0);

// Configuración de la base de datos
$servidor = "localhost";
$usuario = "root";
$password = "";
$basedatos = "sistema_registro_db";

$conn = new mysqli($servidor, $usuario, $password, $basedatos);

if ($conn->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "Error de conexión con la base de datos"
    ]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "status" => "error",
        "message" => "Método no permitido"
    ]);
    exit;
}

$accion = trim($_POST["accion"] ?? "");
$correo = trim($_POST["correo"] ?? "");
$passwordInput = trim($_POST["password"] ?? "");

/* 1. ACCIÓN: REGISTRO */
if ($accion === "registro") {
    $nombre = trim($_POST["nombre"] ?? "");
    $rol = trim($_POST["rol"] ?? "usuario");

    if ($nombre === "" || $correo === "" || $passwordInput === "") {
        echo json_encode([
            "status" => "error",
            "message" => "Por favor, completa todos los campos del formulario de registro."
        ]);
        exit;
    }

    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            "status" => "error",
            "message" => "Ingresa una dirección de correo electrónico válida para crear tu cuenta."
        ]);
        exit;
    }

    if (strlen($passwordInput) < 6) {
        echo json_encode([
            "status" => "error",
            "message" => "La contraseña debe tener al menos 6 caracteres."
        ]);
        exit;
    }

    $passwordHash = password_hash($passwordInput, PASSWORD_BCRYPT);

    $sql = "INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)";
    $statement = $conn->prepare($sql);

    if (!$statement) {
        echo json_encode([
            "status" => "error",
            "message" => "Error al preparar la consulta de registro."
        ]);
        exit;
    }

    $statement->bind_param("ssss", $nombre, $correo, $passwordHash, $rol);

    if ($statement->execute()) {
        echo json_encode([
            "status" => "success",
            "message" => "¡Registro exitoso! Redirigiendo..."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "El correo electrónico ingresado ya está registrado con otra cuenta."
        ]);
    }

    $statement->close();
    $conn->close();
    exit;
}

/* 2. ACCIÓN: LOGIN (Sin validaciones estrictas de formato/campos, solo verificación de credenciales) */
if ($accion === "login") {
    $sql = "SELECT id, nombre, password, rol FROM usuarios WHERE correo = ?";
    $statement = $conn->prepare($sql);

    if (!$statement) {
        echo json_encode([
            "status" => "error",
            "message" => "Error en la consulta de autenticación."
        ]);
        exit;
    }

    $statement->bind_param("s", $correo);
    $statement->execute();
    $resultado = $statement->get_result();

    if ($usuario = $resultado->fetch_assoc()) {
        if (password_verify($passwordInput, $usuario["password"])) {
            $_SESSION["usuario_id"] = $usuario["id"];
            $_SESSION["usuario_nombre"] = $usuario["nombre"];
            $_SESSION["usuario_rol"] = $usuario["rol"];

            echo json_encode([
                "status" => "success",
                "message" => "¡Inicio de sesión correcto!",
                "rol" => $usuario["rol"]
            ]);

            $statement->close();
            $conn->close();
            exit;
        }
    }

    // Única respuesta/validación para fallo de autenticación
    echo json_encode([
        "status" => "error",
        "message" => "Credenciales incorrectas."
    ]);

    $statement->close();
    $conn->close();
    exit;
}

/* 3. ACCIÓN: OBTENER PERFIL */
if ($accion === "obtener_perfil") {
    $usuario_id = $_SESSION["usuario_id"] ?? null;
    
    if (!$usuario_id) {
        echo json_encode([
            "status" => "error",
            "message" => "No hay una sesión activa."
        ]);
        exit;
    }

    $sql = "SELECT id, nombre, correo, rol, foto FROM usuarios WHERE id = ?";
    $statement = $conn->prepare($sql);

    if (!$statement) {
        echo json_encode([
            "status" => "error",
            "message" => "Error al obtener datos del usuario."
        ]);
        exit;
    }

    $statement->bind_param("i", $usuario_id);
    $statement->execute();
    $resultado = $statement->get_result();

    if ($usuario = $resultado->fetch_assoc()) {
        echo json_encode([
            "status" => "success",
            "data" => $usuario
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Usuario no encontrado."
        ]);
    }

    $statement->close();
    $conn->close();
    exit;
}

/* 4. ACCIÓN: ACTUALIZAR PERFIL */
if ($accion === "actualizar_perfil") {
    $usuario_id = $_SESSION["usuario_id"] ?? null;

    if (!$usuario_id) {
        echo json_encode([
            "status" => "error",
            "message" => "Acceso no autorizado."
        ]);
        exit;
    }

    $nuevo_nombre = trim($_POST["nombre"] ?? "");
    $foto_base64 = $_POST["foto"] ?? null;

    if ($nuevo_nombre === "") {
        echo json_encode([
            "status" => "error",
            "message" => "El campo de nombre no puede estar vacío."
        ]);
        exit;
    }

    if ($foto_base64) {
        $sql = "UPDATE usuarios SET nombre = ?, foto = ? WHERE id = ?";
        $statement = $conn->prepare($sql);
        if (!$statement) {
            echo json_encode(["status" => "error", "message" => "Error en la consulta SQL"]);
            exit;
        }
        $statement->bind_param("ssi", $nuevo_nombre, $foto_base64, $usuario_id);
    } else {
        $sql = "UPDATE usuarios SET nombre = ? WHERE id = ?";
        $statement = $conn->prepare($sql);
        if (!$statement) {
            echo json_encode(["status" => "error", "message" => "Error en la consulta SQL"]);
            exit;
        }
        $statement->bind_param("si", $nuevo_nombre, $usuario_id);
    }

    if ($statement->execute()) {
        $_SESSION["usuario_nombre"] = $nuevo_nombre;
        echo json_encode([
            "status" => "success",
            "message" => "Perfil actualizado correctamente."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Error al actualizar el perfil en la base de datos."
        ]);
    }

    $statement->close();
    $conn->close();
    exit;
}

/* RESPUESTA POR DEFECTO */
echo json_encode([
    "status" => "error",
    "message" => "Acción no válida."
]);

$conn->close();
?>
<?php
header("Content-Type: application/json; charset=UTF-8");

ini_set('display_errors', 0);
error_reporting(0);

session_start();

$servidor = "localhost";
$usuario = "root";
$password = "";
$basedatos = "sistema_crud";

$conn = new mysqli($servidor, $usuario, $password, $basedatos);

if ($conn->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "Error de conexión con la base de datos de inventario físico"
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
$rolActual = $_SESSION["usuario_rol"] ?? "usuario";

// VALIDACIÓN DE SEGURIDAD
if (in_array($accion, ["crear", "actualizar", "eliminar"])) {
    if ($rolActual !== "admin") {
        echo json_encode([
            "status" => "error",
            "message" => "Acceso denegado: Solo los administradores pueden modificar el inventario."
        ]);
        exit;
    }
}

/* 1. LISTAR */
if ($accion === "listar") {
    $sql = "SELECT * FROM usuarios ORDER BY id DESC";
    $result = $conn->query($sql);
    
    $registros = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $registros[] = $row;
        }
    }

    echo json_encode([
        "status" => "success",
        "data" => $registros
    ]);
    $conn->close();
    exit;
}

/* 2. CREAR */
if ($accion === "crear") {
    $nombre = trim($_POST["nombre"] ?? "");
    $genero = trim($_POST["genero"] ?? "");
    $idioma = trim($_POST["idioma"] ?? "");
    $clasificacion = trim($_POST["clasificacion_edad"] ?? "");
    $formato = trim($_POST["tipo_formato"] ?? "");
    $estado = trim($_POST["estado"] ?? "");
    $stock = intval($_POST["stock"] ?? 0);
    $precio = floatval($_POST["precio"] ?? 0);

    // Validación de precio estricta
    if ($precio >= 1500) {
        echo json_encode(["status" => "error", "message" => "El precio no puede alcanzar o superar los 1500."]);
        exit;
    }

    $rutaImagen = NULL;
    if (isset($_FILES["imagen"]) && $_FILES["imagen"]["error"] === UPLOAD_ERR_OK) {
        $directorio = "../uploads/";
        if (!is_dir($directorio)) {
            mkdir($directorio, 0777, true);
        }
        $nombreArchivo = time() . "_" . basename($_FILES["imagen"]["name"]);
        $rutaCompleta = $directorio . $nombreArchivo;
        if (move_uploaded_file($_FILES["imagen"]["tmp_name"], $rutaCompleta)) {
            $rutaImagen = "uploads/" . $nombreArchivo;
        }
    }

    $sql = "INSERT INTO usuarios (imagen, nombre, genero, idioma, clasificacion_edad, tipo_formato, estado, stock, precio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssssid", $rutaImagen, $nombre, $genero, $idioma, $clasificacion, $formato, $estado, $stock, $precio);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Registro creado correctamente"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al guardar registro"]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

/* 3. OBTENER POR ID */
if ($accion === "obtener") {
    $id = intval($_POST["id"] ?? 0);
    $sql = "SELECT * FROM usuarios WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($data = $res->fetch_assoc()) {
        echo json_encode(["status" => "success", "data" => $data]);
    } else {
        echo json_encode(["status" => "error", "message" => "Registro no encontrado"]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

/* 4. ACTUALIZAR */
if ($accion === "actualizar") {
    $id = intval($_POST["id"] ?? 0);
    $nombre = trim($_POST["nombre"] ?? "");
    $genero = trim($_POST["genero"] ?? "");
    $idioma = trim($_POST["idioma"] ?? "");
    $clasificacion = trim($_POST["clasificacion_edad"] ?? "");
    $formato = trim($_POST["tipo_formato"] ?? "");
    $estado = trim($_POST["estado"] ?? "");
    $stock = intval($_POST["stock"] ?? 0);
    $precio = floatval($_POST["precio"] ?? 0);

    // Validación de precio estricta
    if ($precio >= 1500) {
        echo json_encode(["status" => "error", "message" => "El precio no puede alcanzar o superar los 1500."]);
        exit;
    }

    if (isset($_FILES["imagen"]) && $_FILES["imagen"]["error"] === UPLOAD_ERR_OK) {
        $directorio = "../uploads/";
        if (!is_dir($directorio)) {
            mkdir($directorio, 0777, true);
        }
        $nombreArchivo = time() . "_" . basename($_FILES["imagen"]["name"]);
        $rutaCompleta = $directorio . $nombreArchivo;
        if (move_uploaded_file($_FILES["imagen"]["tmp_name"], $rutaCompleta)) {
            $rutaImagen = "uploads/" . $nombreArchivo;
            $sql = "UPDATE usuarios SET imagen = ?, nombre = ?, genero = ?, idioma = ?, clasificacion_edad = ?, tipo_formato = ?, estado = ?, stock = ?, precio = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssssidi", $rutaImagen, $nombre, $genero, $idioma, $clasificacion, $formato, $estado, $stock, $precio, $id);
        }
    } else {
        $sql = "UPDATE usuarios SET nombre = ?, genero = ?, idioma = ?, clasificacion_edad = ?, tipo_formato = ?, estado = ?, stock = ?, precio = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssssidi", $nombre, $genero, $idioma, $clasificacion, $formato, $estado, $stock, $precio, $id);
    }

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Registro actualizado correctamente"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al actualizar registro"]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

/* 5. ELIMINAR */
if ($accion === "eliminar") {
    $id = intval($_POST["id"] ?? 0);
    $sql = "DELETE FROM usuarios WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Registro eliminado correctamente"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Error al eliminar registro"]);
    }
    $stmt->close();
    $conn->close();
    exit;
}

echo json_encode(["status" => "error", "message" => "Acción no válida"]);
$conn->close();
?>
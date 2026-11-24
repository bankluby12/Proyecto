<?php
// Desactivar la salida de errores en HTML para asegurar que siempre se responda en JSON
ini_set('display_errors', 0);
error_reporting(0);

header("Content-Type: application/json; charset=UTF-8");

try {
    session_start();

    $servidor = "localhost";
    $usuario = "root";
    $password = "";
    $basedatos = "sistema_digital";

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
    $rolActual = $_SESSION["usuario_rol"] ?? "usuario";

    // Validación de seguridad de roles
    if (in_array($accion, ["crear", "actualizar", "eliminar"])) {
        if ($rolActual !== "admin") {
            echo json_encode([
                "status" => "error",
                "message" => "Acceso denegado: Solo los administradores pueden modificar el inventario."
            ]);
            exit;
        }
    }

    function obtenerPlataformasString($postData) {
        if (!isset($postData["plataforma"])) {
            return "";
        }
        if (is_array($postData["plataforma"])) {
            return implode(", ", array_map('trim', $postData["plataforma"]));
        }
        return trim($postData["plataforma"]);
    }

    // Función para validar en el servidor que los enlaces correspondan a las páginas oficiales
    function validarDominioOficialServidor($plataformaStr, $linksArray) {
        $plataformaLower = strtolower($plataformaStr);
        if (strpos($plataformaLower, 'otro') !== false) {
            return true; 
        }

        foreach ($linksArray as $link) {
            $linkLower = strtolower($link);
            $valido = false;

            if (strpos($plataformaLower, 'steam') !== false && (strpos($linkLower, 'store.steampowered.com') !== false || strpos($linkLower, 'steamcommunity.com') !== false)) {
                $valido = true;
            } elseif (strpos($plataformaLower, 'eshop') !== false && (strpos($linkLower, 'nintendo.com') !== false || strpos($linkLower, 'nintendo.es') !== false)) {
                $valido = true;
            } elseif (strpos($plataformaLower, 'xbox') !== false && strpos($linkLower, 'xbox.com') !== false) {
                $valido = true;
            } elseif (strpos($plataformaLower, 'playstation') !== false && strpos($linkLower, 'playstation.com') !== false) {
                $valido = true;
            }

            if (!$valido) {
                return false;
            }
        }
        return true;
    }

    /* 1. LISTAR */
    if ($accion === "listar") {
        $sql = "SELECT * FROM usuarios ORDER BY id DESC";
        $result = $conn->query($sql);
        
        $registros = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $row['links'] = json_decode($row['links'] ?? '[]', true);
                if (!is_array($row['links'])) {
                    $row['links'] = [];
                }
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
        $clasificacion = trim($_POST["clasificacion_edad"] ?? $_POST["clasificacion"] ?? "");
        $plataformaStr = obtenerPlataformasString($_POST);
        
        // Cambiado a floatval para aceptar decimales en la calificación
        $calificacion = floatval($_POST["calificacion_actual"] ?? $_POST["calificacion"] ?? 0);
        $precio = floatval($_POST["precio"] ?? 0);

        $linksArray = $_POST["links"] ?? [];
        if (!is_array($linksArray)) {
            $linksArray = [];
        }
        $linksArray = array_filter(array_map('trim', $linksArray));

        if (strpos(strtolower($plataformaStr), 'otro') !== false) {
            if (count($linksArray) < 1 || count($linksArray) > 5) {
                echo json_encode(["status" => "error", "message" => "Si seleccionas 'Otro', debes proporcionar entre 1 y 5 enlaces."]);
                exit;
            }
        }

        if (!validarDominioOficialServidor($plataformaStr, $linksArray)) {
            echo json_encode(["status" => "error", "message" => "Error: Los enlaces deben pertenecer estrictamente a las páginas oficiales de Steam, eShop, Xbox o PlayStation Store."]);
            exit;
        }

        $linksJson = json_encode(array_values($linksArray));

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

        $sql = "INSERT INTO usuarios (imagen, nombre, genero, idioma, clasificacion_edad, plataforma, links, calificacion_actual, precio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            echo json_encode(["status" => "error", "message" => "Error al preparar SQL: " . $conn->error]);
            exit;
        }

        // 7 strings, 2 doubles (calificación y precio) -> "sssssssdd"
        $stmt->bind_param("sssssssdd", $rutaImagen, $nombre, $genero, $idioma, $clasificacion, $plataformaStr, $linksJson, $calificacion, $precio);

        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Registro digital creado correctamente"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Error al guardar registro: " . $stmt->error]);
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
            $data['links'] = json_decode($data['links'] ?? '[]', true);
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
        $clasificacion = trim($_POST["clasificacion_edad"] ?? $_POST["clasificacion"] ?? "");
        $plataformaStr = obtenerPlataformasString($_POST);
        
        // Cambiado a floatval
        $calificacion = floatval($_POST["calificacion_actual"] ?? $_POST["calificacion"] ?? 0);
        $precio = floatval($_POST["precio"] ?? 0);

        $linksArray = $_POST["links"] ?? [];
        if (!is_array($linksArray)) {
            $linksArray = [];
        }
        $linksArray = array_filter(array_map('trim', $linksArray));

        if (strpos(strtolower($plataformaStr), 'otro') !== false) {
            if (count($linksArray) < 1 || count($linksArray) > 5) {
                echo json_encode(["status" => "error", "message" => "Si seleccionas 'Otro', debes proporcionar entre 1 y 5 enlaces."]);
                exit;
            }
        }

        if (!validarDominioOficialServidor($plataformaStr, $linksArray)) {
            echo json_encode(["status" => "error", "message" => "Error: Los enlaces deben pertenecer estrictamente a las páginas oficiales de Steam, eShop, Xbox o PlayStation Store."]);
            exit;
        }

        $linksJson = json_encode(array_values($linksArray));

        if (isset($_FILES["imagen"]) && $_FILES["imagen"]["error"] === UPLOAD_ERR_OK) {
            $directorio = "../uploads/";
            if (!is_dir($directorio)) {
                mkdir($directorio, 0777, true);
            }
            $nombreArchivo = time() . "_" . basename($_FILES["imagen"]["name"]);
            $rutaCompleta = $directorio . $nombreArchivo;
            if (move_uploaded_file($_FILES["imagen"]["tmp_name"], $rutaCompleta)) {
                $rutaImagen = "uploads/" . $nombreArchivo;
                $sql = "UPDATE usuarios SET imagen = ?, nombre = ?, genero = ?, idioma = ?, clasificacion_edad = ?, plataforma = ?, links = ?, calificacion_actual = ?, precio = ? WHERE id = ?";
                $stmt = $conn->prepare($sql);
                // 7 strings, 2 doubles, 1 int -> "sssssssddi"
                $stmt->bind_param("sssssssddi", $rutaImagen, $nombre, $genero, $idioma, $clasificacion, $plataformaStr, $linksJson, $calificacion, $precio, $id);
            }
        } else {
            $sql = "UPDATE usuarios SET nombre = ?, genero = ?, idioma = ?, clasificacion_edad = ?, plataforma = ?, links = ?, calificacion_actual = ?, precio = ? WHERE id = ?";
            $stmt = $conn->prepare($sql);
            // 6 strings, 2 doubles, 1 int -> "ssssssddi"
            $stmt->bind_param("ssssssddi", $nombre, $genero, $idioma, $clasificacion, $plataformaStr, $linksJson, $calificacion, $precio, $id);
        }

        if ($stmt && $stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Registro digital actualizado correctamente"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Error al actualizar registro digital"]);
        }
        if ($stmt) $stmt->close();
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

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Error interno: " . $e->getMessage()
    ]);
}
?>
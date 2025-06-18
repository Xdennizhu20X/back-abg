# Documentación de la API - Movilización de Ganado Galápagos

## 1. Ejecución del Backend

### Requisitos
- Node.js >= 14
- PostgreSQL >= 12

### Pasos para ejecutar

1. Instala las dependencias:
   ```
   npm install
   ```
2. Configura el archivo `.env` con los datos de tu base de datos y JWT.
3. Inicializa la base de datos (esto borra los datos existentes):
   ```
   npm run init-db
   ```
4. Inicia el servidor:
   ```bash
   npm run dev
   ```

El servidor estará disponible en: `http://localhost:3000`

---

## 2. Autenticación y Registro de Usuarios

### Registro de usuario
- **Endpoint:** `POST /api/auth/register`
- **Body JSON:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "password": "contraseña123",
  "rol": "ganadero" // Opcional: "ganadero", "tecnico", "admin"
}
```

### Login de usuario
- **Endpoint:** `POST /api/auth/login`
- **Body JSON:**
```json
{
  "email": "juan@ejemplo.com",
  "password": "contraseña123"
}
```
- **Respuesta:** Incluye un campo `token` que debes usar en las siguientes peticiones protegidas.

### Obtener perfil
- **Endpoint:** `GET /api/auth/profile`
- **Headers:**
  - `Authorization: Bearer <token>`

---

## 3. Registro de Movilización Completa

### Endpoint
- **POST** `/api/movilizaciones/registro-completo`
- **Headers:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

### JSON de ejemplo para el frontend
```json
{
  "usuario_id": 1,
  "predio_origen": {
    "nombre": "Granja Origen",
    "ubicacion": "Santa Cruz",
    "tipo": "origen",
    "latitud": -0.123456,
    "longitud": -90.654321
  },
  "predio_destino": {
    "nombre": "Granja Destino",
    "ubicacion": "Isabela",
    "tipo": "destino",
    "latitud": -0.654321,
    "longitud": -91.123456
  },
  "animales": [
    {
      "identificador": "A001",
      "raza": "Brahman",
      "sexo": "macho",
      "color": "blanco",
      "edad": 3,
      "comerciante": "Juan Pérez",
      "observaciones": "Ninguna"
    }
  ],
  "aves": [
    {
      "identificador": "G01",
      "categoria": "Engorde",
      "edad": 1,
      "color": "amarillo",
      "observaciones": "Sanas"
    }
  ],
  "datos_adicionales": "Propio",
  "transporte": {
    "nombre_conductor": "Pedro López",
    "placa": "ABC-123",
    "tipo_vehiculo": "Camión"
  },
  "firma_tecnico": {
    "tecnico_id": 2,
    "fecha_firma": "2024-06-01T10:00:00Z",
    "firma_url": "https://firma.com/tecnico.png"
  },
  "firma_interesado": {
    "tecnico_id": 1,
    "fecha_firma": "2024-06-01T10:05:00Z",
    "firma_url": "https://firma.com/interesado.png"
  },
  "fecha_solicitud": "2024-06-01T09:00:00Z",
  "observaciones_tecnico": "Todo en orden",
  "tecnico_id": 2,
  "fecha_aprobacion": null,
  "certificado_url": null
}
```

### Respuesta exitosa
```json
{
  "success": true,
  "message": "Movilización registrada correctamente",
  "movilizacion_id": 1
}
```

---

## 4. Notas importantes
- Todos los endpoints protegidos requieren el header `Authorization: Bearer <token>`.
- Los campos obligatorios para registrar una movilización son: `usuario_id`, `predio_origen`, `predio_destino`, `fecha_solicitud`.
- Los campos de animales como `raza`, `sexo`, `especie` ahora son opcionales.
- Si tienes dudas sobre los IDs de usuario o técnico, puedes consultar la base de datos o usar los endpoints de usuario.

---

## 5. Otros endpoints útiles

- **Listar movilizaciones:**
  - `GET /api/movilizaciones` (puedes filtrar por estado, fecha, etc.)
- **Obtener movilización por ID:**
  - `GET /api/movilizaciones/:id`

---

**Para cualquier duda, revisa el código fuente o contacta al desarrollador del backend.**

# PRD — IoT Sensor Dashboard

> **Versión:** 1.0 · **Fecha:** Marzo 2026 · **Estado:** Draft

---

## 1. Resumen del producto

Una aplicación web para monitorear sensores IoT organizados jerárquicamente en **edificios → salas → sensores**. El usuario puede crear y gestionar esta jerarquía desde el frontend, mientras que los sensores físicos envían mediciones vía HTTP directamente a Supabase. La app muestra el último valor registrado por cada sensor en tiempo real.

---

## 2. Objetivo

Demostrar un flujo completo de desarrollo con IA: diseño UX → generación de frontend con agente → backend serverless en Supabase → integración con hardware IoT.

---

## 3. Stack tecnológico

| Capa | Herramienta |
|---|---|
| Frontend | React + Vite (generado con Cursor) |
| Base de datos | Supabase (PostgreSQL) |
| API | Supabase REST API (autogenerada) |
| Diseño UX | Stitch |
| Pruebas de integración | Postman |

---

## 4. Usuarios y roles

- **Administrador (único rol):** Crea y gestiona edificios, salas y sensores. No se requiere autenticación. La app es pública para propósitos de demo.

---

## 5. Arquitectura de datos

### 5.1 Tablas en Supabase

**`buildings`**

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Generado automáticamente |
| name | text | Nombre del edificio |
| created_at | timestamp | Fecha de creación |

**`rooms`**

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Generado automáticamente |
| building_id | uuid (FK → buildings) | Edificio al que pertenece |
| name | text | Nombre de la sala |
| created_at | timestamp | Fecha de creación |

**`sensors`**

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Generado automáticamente |
| room_id | uuid (FK → rooms) | Sala a la que pertenece |
| name | text | Nombre del sensor |
| type | enum | `temperature` / `humidity` / `luminosity` |
| unit | text | Unidad de medida (°C, %, lux) |
| created_at | timestamp | Fecha de creación |

**`measurements`**

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Generado automáticamente |
| sensor_id | uuid (FK → sensors) | Sensor que generó la medición |
| value | float | Valor de la lectura |
| recorded_at | timestamp | Fecha y hora de la medición |

> 💡 Los sensores físicos insertan filas en `measurements` enviando un `POST` a la Supabase REST API con el `sensor_id` y el `value`.

---

## 6. Vistas y funcionalidad

### Vista 1 — Edificios (`/`)

**Descripción:** Pantalla de inicio. Muestra todos los edificios registrados.

**Elementos de UI:**
- Grid de tarjetas, una por edificio
- Cada tarjeta muestra: nombre del edificio y número de salas
- Botón **"+ Nuevo edificio"** abre un modal con un campo de texto para el nombre
- Al hacer clic en una tarjeta se navega a Vista 2

**Lógica:**
- `GET /buildings` al cargar la página
- `POST /buildings` al confirmar el modal

---

### Vista 2 — Salas (`/buildings/:id`)

**Descripción:** Muestra las salas dentro de un edificio específico.

**Elementos de UI:**
- Breadcrumb: `Edificios > [Nombre del edificio]`
- Grid de tarjetas, una por sala
- Cada tarjeta muestra: nombre de la sala y número de sensores
- Botón **"+ Nueva sala"** abre un modal con un campo de texto para el nombre
- Al hacer clic en una tarjeta se navega a Vista 3

**Lógica:**
- `GET /rooms?building_id=eq.[id]` al cargar
- `POST /rooms` con `building_id` al confirmar el modal

---

### Vista 3 — Sensores (`/rooms/:id`)

**Descripción:** Muestra los sensores dentro de una sala y el último valor registrado por cada uno.

**Elementos de UI:**
- Breadcrumb: `Edificios > [Edificio] > [Sala]`
- Grid de tarjetas, una por sensor
- Cada tarjeta muestra:
  - Nombre del sensor
  - Ícono según tipo (🌡️ temperatura · 💧 humedad · ☀️ luminosidad)
  - Último valor + unidad de medida (ej. `23.4 °C`)
  - Timestamp de la última lectura
- Botón **"+ Nuevo sensor"** abre un modal con el formulario de creación

**Formulario de creación de sensor:**
- Nombre (texto)
- Tipo (select: Temperatura / Humedad / Luminosidad)
- Unidad de medida (texto, ej. °C, %, lux)

**Lógica:**
- `GET /sensors?room_id=eq.[id]` al cargar
- Para cada sensor: `GET /measurements?sensor_id=eq.[id]&order=recorded_at.desc&limit=1`
- `POST /sensors` con `room_id` al confirmar el modal

---

## 7. Integración con sensores físicos

Los dispositivos físicos (ESP32, Arduino, Raspberry Pi, etc.) envían mediciones mediante una petición HTTP POST a la Supabase REST API. No requieren ningún backend adicional.

**Endpoint:**
```
POST https://[proyecto].supabase.co/rest/v1/measurements
```

**Headers requeridos:**
```
Content-Type: application/json
apikey: [supabase_anon_key]
Authorization: Bearer [supabase_anon_key]
```

**Body:**
```json
{
  "sensor_id": "uuid-del-sensor",
  "value": 23.4,
  "recorded_at": "2026-03-02T10:00:00Z"
}
```

> 💡 En clase se simulará este envío desde **Postman** antes de conectar hardware real.

---

## 8. Flujo de navegación

```
/ (Edificios)
  └── /buildings/:id (Salas)
        └── /rooms/:id (Sensores + últimas lecturas)
```

La navegación es unidireccional hacia adelante. El breadcrumb permite regresar a cualquier nivel.

---

## 9. Criterios de aceptación

| # | Criterio |
|---|---|
| 1 | El usuario puede crear un edificio y verlo reflejado en Supabase inmediatamente |
| 2 | El usuario puede crear salas dentro de un edificio |
| 3 | El usuario puede crear sensores dentro de una sala con nombre, tipo y unidad |
| 4 | La Vista 3 muestra el último valor recibido por cada sensor |
| 5 | Un POST externo (Postman) a `/measurements` actualiza el valor visible en la UI |
| 6 | La app funciona sin login ni autenticación |

---

## 10. Fuera de alcance (v1)

- Autenticación y manejo de usuarios
- Histórico y gráficas de mediciones
- Alertas o umbrales configurables
- Soporte multi-tenant
- Modo oscuro

---

## 11. Prompt base para Cursor

> Usar junto con la imagen del diseño UX exportada desde Stitch.

```
Genera la Vista 3 de una aplicación React + Vite que muestra los sensores 
de una sala IoT. Usa el diseño de la imagen adjunta como referencia visual exacta.

Contexto:
- La app ya tiene las Vistas 1 y 2 funcionando
- Supabase URL y anon key están en variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
- Las tablas relevantes son: sensors y measurements
- Usa el cliente de Supabase JS ya configurado en /src/lib/supabase.js

Requerimientos:
- Grid de tarjetas, una por sensor
- Cada tarjeta muestra: nombre, ícono por tipo, último valor + unidad, timestamp
- Botón "+ Nuevo sensor" que abre un modal con campos: nombre, tipo (select), unidad
- Al crear un sensor hacer POST a la tabla sensors con room_id del parámetro de ruta
- Para el último valor: query a measurements filtrado por sensor_id, ordenado por 
  recorded_at desc, limit 1
- Breadcrumb con navegación a edificios y salas
- Sin autenticación
```

---

---

## 12. Deploy en producción con Vercel

Vercel es la plataforma recomendada para hostear esta aplicación por su integración nativa con proyectos Vite/React y su flujo de deploy en un solo comando.

### Pasos

**1. Instalar Vercel CLI**
```bash
npm install -g vercel
```

**2. Desde la raíz del proyecto, ejecutar:**
```bash
vercel
```
El CLI guía con preguntas simples (nombre del proyecto, framework detectado automáticamente como Vite).

**3. Configurar las variables de entorno en Vercel**

Las variables definidas en `.env.local` no se suben al repositorio. Hay que declararlas manualmente en el dashboard de Vercel o desde CLI:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

**4. Redeploy con variables aplicadas:**
```bash
vercel --prod
```

Al finalizar, Vercel entrega una URL pública del tipo `https://[proyecto].vercel.app` donde la app queda accesible desde cualquier dispositivo, incluyendo los sensores físicos que necesiten verificar la UI.

> 💡 Cada vez que se haga `git push` a la rama principal, Vercel puede redesplegar automáticamente si se conecta el repositorio desde su dashboard.

---

*Documento preparado para la clase de Desarrollo de Software con IA — Posgrado en Automatización y Control*
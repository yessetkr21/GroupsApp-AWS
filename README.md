# GroupsApp

Sistema de mensajería instantánea distribuido similar a WhatsApp/Telegram. Proyecto académico para **ST0263 Tópicos Especiales en Telemática / SI3007 Sistemas Distribuidos (2026-1)**.

## Integrantes

- Camilo Sanchez Salinas
- Samuel Santamaria
- Yessetk Rodriguez

---

## Arquitectura

Microservicios desplegados en AWS EC2, con datos en RDS MySQL + S3.

```
            ┌──────────────┐
  browser ─▶│  Nginx :80   │  (frontend SPA React)
            └──────┬───────┘
                   │ proxy /api /socket.io
                   ▼
            ┌──────────────┐        ┌──────────────┐
            │ backend :3000│◀─gRPC─▶│ messages-svc │:50051
            │ REST + WS    │        └──────────────┘
            └──┬───┬───────┘        ┌──────────────┐
               │   └──────gRPC─────▶│ groups-svc   │:50052
               │                    └──────────────┘
               │ AMQP          ▲
               ▼               │
           ┌────────┐          │ consume message.sent
           │rabbitmq│──────────┘
           └────────┘
           ┌────────┐    ┌────────┐
           │ redis  │    │ etcd   │  (presence, coord)
           └────────┘    └────────┘
           ┌────────┐    ┌────────┐
           │ RDS    │    │  S3    │  (datos, archivos)
           └────────┘    └────────┘
```

### Microservicios

| Servicio | Stack | Puerto | Responsabilidad |
|----------|-------|--------|-----------------|
| `frontend` | React + Vite + Nginx | 80 | SPA |
| `backend` | Node.js + Express + Socket.IO | 3000 | API REST, WebSocket, publisher AMQP |
| `messages-service` | Node.js + gRPC | 50051 | Historial de mensajes, consumer AMQP |
| `groups-service` | Node.js + gRPC | 50052 | Grupos, canales, miembros, contactos |
| `rabbitmq` | RabbitMQ 3.13 | 5672 / 15672 | MOM (message-oriented middleware) |
| `redis` | Redis 7.2 | 6379 | Caché de presencia y sesión |
| `etcd` | etcd 3.5 | 2379 | Coordinación y service discovery |

### Comunicaciones

- **REST** — cliente ↔ backend (externo)
- **WebSocket (Socket.IO)** — mensajería tiempo real
- **gRPC** — backend ↔ microservicios internos (messages-service, groups-service)
- **AMQP (RabbitMQ)** — eventos `message.sent` desacoplados

### Datos

- **MySQL (RDS)** — usuarios, grupos, canales, mensajes, contactos. Transacciones ACID.
- **S3** — archivos e imágenes (presigned URLs via backend).
- **Redis** — presencia online/offline, caché ligera.

---

## Funcionalidades

- Registro y autenticación con JWT + bcrypt
- Creación y gestión de grupos con roles (admin / member) y modos de suscripción
- Canales dentro de grupos
- Mensajería 1-n (grupo/canal) y 1-1 (DM)
- Estados de entrega y lectura (sent / delivered / read)
- Presencia online/offline
- Envío y visualización de archivos e imágenes
- Historial persistente
- Contactos

---

## Requerimientos No Funcionales

- Arquitectura microservicios (4 servicios + 3 infra)
- Comunicación síncrona (REST + gRPC) y asíncrona (RabbitMQ)
- Coordinación distribuida (etcd)
- Almacenamiento distribuido (S3)
- Despliegue en AWS (EC2 + RDS + S3)
- Logs (Winston) + métricas Prometheus (`/metrics` en backend:3000, messages:9091, groups:9092)
- Seguridad básica: JWT, bcrypt, Helmet, rate limiting en auth, CORS estricto

---

## Setup Local

### Requisitos
- Docker + Docker Compose
- Node 20+ (solo si corres fuera de Docker)

### Variables de Entorno

Crea `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=groupsapp
DB_PASSWORD=groupsapp123
DB_NAME=groupsapp

# JWT
JWT_SECRET=cambia-esto-en-produccion

# AWS (solo necesarias fuera de EC2 con IAM role)
AWS_REGION=us-east-1
S3_BUCKET_NAME=tu-bucket

# Backend
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=http://localhost,http://localhost:80

# Internal
MESSAGES_SERVICE_ADDR=messages-service:50051
GROUPS_SERVICE_ADDR=groups-service:50052
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://groupsapp:groupsapp123@rabbitmq:5672
RABBITMQ_USER=groupsapp
RABBITMQ_PASS=groupsapp123
ETCD_HOSTS=http://etcd:2379
```

### Levantar todo

```bash
docker compose up -d --build
```

### Correr migraciones

```bash
docker compose exec backend node migrations/run.js
```

### Acceder

- App: http://localhost
- RabbitMQ UI: http://localhost:15672 (groupsapp / groupsapp123)
- Backend metrics: http://localhost:3000/metrics
- Messages service metrics: http://localhost:9091/metrics
- Groups service metrics: http://localhost:9092/metrics

---

## Despliegue en AWS

Infra: 1 EC2 `t3.micro` corriendo Docker Compose, 1 RDS `db.t3.micro` MySQL Single-AZ, 1 bucket S3. Costo ≈ $14/mes.

### Resources creadas con AWS CLI

- **S3 bucket** con bucket policy público en `uploads/*`
- **RDS MySQL** `db.t3.micro`, Single-AZ, publicly accessible
- **Security Group RDS** abre 3306
- **Security Group EC2** abre 22, 80, 443, 3000, 9091, 9092, 15672
- **EC2 t3.micro** Amazon Linux 2023, 20GB EBS
- **IAM** `LabInstanceProfile` (AWS Academy role) para credenciales auto-renovadas al subir a S3

### Deploy a EC2

```bash
cd ~/app && git pull && sudo docker compose up -d --build
```

---

## API REST (resumen)

| Endpoint | Auth | Descripción |
|----------|------|-------------|
| `POST /api/auth/register` | — | Registro |
| `POST /api/auth/login` | — | Login (JWT) |
| `GET /api/auth/me` | ✓ | Perfil actual |
| `GET /api/groups` | ✓ | Mis grupos |
| `POST /api/groups` | ✓ | Crear grupo |
| `GET /api/groups/:id` | ✓ | Detalles grupo |
| `DELETE /api/groups/:id` | ✓ | Eliminar (admin) |
| `POST /api/groups/:id/members` | ✓ | Agregar miembro |
| `GET /api/groups/:id/channels` | ✓ | Canales |
| `POST /api/groups/:id/channels` | ✓ | Crear canal |
| `GET /api/messages/group/:id` | ✓ | Mensajes de grupo |
| `GET /api/messages/direct/:userId` | ✓ | DM con usuario |
| `POST /api/files/upload` | ✓ | Subir archivo |
| `GET /api/files/signed-url/*` | ✓ | URL firmada S3 |
| `GET /api/contacts` | ✓ | Mis contactos |
| `POST /api/contacts` | ✓ | Agregar contacto |
| `GET /api/health` | — | Healthcheck |
| `GET /metrics` | — | Prometheus |

## gRPC Services

Ver `proto/messages.proto` y `proto/groups.proto`.

## Eventos AMQP

- Exchange: `groupsapp.events` (topic)
- Routing key `message.sent` — backend publica, messages-service consume para persistir

---

## Tests

```bash
# Backend
cd backend && npm test

# Messages service
cd messages-service && npm test

# Groups service
cd groups-service && npm test
```

---

## Uso de IA

Siguiendo el código de ética del curso, se declara el uso de Claude (Anthropic) para:
- Generación inicial de boilerplate (Dockerfile, docker-compose, estructura de rutas Express)
- Depuración de errores de infraestructura AWS (IAM, IMDS, RDS subnet groups)
- Consultas puntuales sobre sintaxis de AWS CLI y configuración de Prometheus
- Generación de tests unitarios con Jest + Supertest

El núcleo de aprendizaje (diseño de microservicios, protocolos de comunicación REST/gRPC/MOM, esquema de datos distribuidos, coordinación etcd) fue implementado por el equipo.

---

## Entregables

- Informe técnico: `GroupsApp_InformeTecnico.docx`
- Aplicación desplegada: http://44.204.114.74
- Video demo: (por entregar)

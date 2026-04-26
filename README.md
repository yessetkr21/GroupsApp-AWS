# GroupsApp

Sistema de mensajeria instantanea distribuido similar a WhatsApp/Telegram. Proyecto academico para **Topicos Especiales en Telematica /  Sistemas Distribuidos (2026-1)**.

## Integrantes

- Camilo Sanchez Salinas
- Samuel Santamaria
- Yessetk Rodriguez

---

## Arquitectura

Microservicios contenerizados en Kubernetes (AWS EKS), con base de datos en RDS MySQL y almacenamiento de archivos en S3.

```
Internet
    |
AWS ELB (LoadBalancer)
    |
 [frontend :80]  (React SPA + Nginx)
    |
    | /api  /socket.io
    v
 [backend :3000]  (Express + Socket.IO)
    |         |         |
    v         v         v
 [RabbitMQ] [Redis]  [RDS MySQL]
              |
    +---------+---------+
    |                   |
 [messages-service]  [groups-service]
    :50051 gRPC          :50052 gRPC
    AMQP consumer        AMQP consumer
              |
            [S3]
```

### Servicios en EKS

| Servicio | Stack | Puerto | Rol |
|---|---|---|---|
| `frontend` | React 18 + Vite + Nginx | 80 | SPA |
| `backend` | Node.js + Express + Socket.IO | 3000 | API REST, WebSocket, AMQP publisher |
| `messages-service` | Node.js + gRPC | 50051 | Historial mensajes, AMQP consumer |
| `groups-service` | Node.js + gRPC | 50052 | Grupos, canales, miembros |
| `rabbitmq` | RabbitMQ 3.13 | 5672 / 15672 | Message broker |
| `redis` | Redis 7 | 6379 | Cache, presencia online |

### Protocolos de comunicacion

| Canal | Protocolo | Uso |
|---|---|---|
| Cliente <-> Backend | REST HTTP | Operaciones CRUD |
| Cliente <-> Backend | WebSocket (Socket.IO) | Mensajeria tiempo real |
| Backend <-> Microservicios | gRPC | Operaciones internas |
| Backend -> RabbitMQ | AMQP | Publicar evento `message.sent` |
| RabbitMQ -> Microservicios | AMQP | Consumir y persistir mensajes |

### Infraestructura AWS

| Recurso | Tipo | Uso |
|---|---|---|
| EKS | Cluster K8s (2x t3.medium) | Orquestacion contenedores |
| RDS MySQL | `db.t3.micro` | Base de datos principal |
| S3 | Bucket `groupsapp-files-*` | Archivos e imagenes |
| ECR | Registry | Imagenes Docker |
| ELB | LoadBalancer | Punto de entrada publico |

---

## Modelo de Datos

```sql
users           -- id, username, email, password_hash, profile_picture, is_online, last_seen
groups          -- id, name, description, avatar_url, created_by, is_public
group_members   -- group_id, user_id, role (admin|member), joined_at
channels        -- id, group_id, name, description, created_by
group_messages  -- id, sender_id, group_id, channel_id, content, message_type, file_url, created_at
direct_messages -- id, sender_id, receiver_id, content, message_type, file_url, created_at
contacts        -- id, user_id, contact_user_id, created_at
message_reads   -- message_id, user_id, read_at
```

---

## Funcionalidades

- Registro y login con JWT + bcrypt
- Grupos con roles admin / member
- Canales dentro de grupos
- Mensajeria grupal (grupo/canal) y directa (DM)
- Presencia online/offline en tiempo real
- Envio de archivos e imagenes (S3)
- Historial persistente
- Contactos entre usuarios
- Eliminacion de grupos y mensajes propios

---

## Setup Local

### Requisitos

- Docker + Docker Compose

### Variables de entorno

Crear `.env` en la raiz:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=tuuser
DB_PASSWORD=tupassword
DB_NAME=tudbname

JWT_SECRET=cambia-esto-en-produccion

AWS_REGION=us-east-1
S3_BUCKET_NAME=tu-bucket

PORT=3000
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=http://localhost

MESSAGES_SERVICE_ADDR=messages-service:50051
GROUPS_SERVICE_ADDR=groups-service:50052
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://groupsapp:groupsapp123@rabbitmq:5672
RABBITMQ_USER=groupsapp
RABBITMQ_PASS=groupsapp123
ETCD_HOSTS=http://etcd:2379
```

### Levantar

```bash
docker compose up -d --build
```

### Migraciones

```bash
docker compose exec backend node migrations/run.js
```

### URLs locales

| Servicio | URL |
|---|---|
| App | http://localhost |
| RabbitMQ UI | http://localhost:15672 (groupsapp / groupsapp123) |
| Backend metrics | http://localhost:3000/metrics |

---

## Despliegue en AWS EKS

### Pre-requisitos

- AWS CLI configurado con credenciales de sesion
- kubectl + eksctl instalados
- Docker con acceso a ECR

### Cluster

Definido en `eks-cluster.yaml`: 2 nodos `t3.medium`, region `us-east-1`, auto-scaling hasta 4 nodos.

### Pasos de despliegue

```bash
# 1. Crear cluster
eksctl create cluster -f eks-cluster.yaml

# 2. Instalar addons de red
aws eks create-addon --cluster-name groupsapp-cluster --addon-name vpc-cni --region us-east-1
aws eks create-addon --cluster-name groupsapp-cluster --addon-name kube-proxy --region us-east-1
aws eks create-addon --cluster-name groupsapp-cluster --addon-name coredns --region us-east-1

# 3. Kubeconfig
aws eks update-kubeconfig --name groupsapp-cluster --region us-east-1

# 4. Login ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# 5. Deploy manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# 6. Exponer servicios
kubectl patch service frontend -n groupsapp -p '{"spec":{"type":"LoadBalancer"}}'
kubectl patch service backend -n groupsapp -p '{"spec":{"type":"LoadBalancer"}}'

# 7. Alta disponibilidad backend
kubectl scale deployment/backend --replicas=2 -n groupsapp
```

### Actualizacion de secrets AWS

Las credenciales de AWS Academy expiran cada sesion. Actualizar `k8s/secret.yaml` con los valores en base64:

```bash
echo -n "ASIA..." | base64   # AWS_ACCESS_KEY_ID
echo -n "..." | base64       # AWS_SECRET_ACCESS_KEY
echo -n "..." | base64       # AWS_SESSION_TOKEN
```

---

## API REST

Prefijo `/api/`. Autenticacion con `Authorization: Bearer <token>`.

Formato de respuesta:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "mensaje de error" }
```

### Autenticacion

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| POST | `/api/auth/register` | No | Registro |
| POST | `/api/auth/login` | No | Login, retorna JWT |
| GET | `/api/auth/me` | Si | Perfil actual |

### Grupos

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/groups` | Si | Mis grupos |
| POST | `/api/groups` | Si | Crear grupo |
| GET | `/api/groups/:id` | Si | Detalle de grupo |
| DELETE | `/api/groups/:id` | Si | Eliminar grupo (admin) |
| POST | `/api/groups/:id/members` | Si | Agregar miembro |
| DELETE | `/api/groups/:id/members/:userId` | Si | Remover miembro |

### Canales

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/groups/:id/channels` | Si | Canales del grupo |
| POST | `/api/groups/:id/channels` | Si | Crear canal |
| DELETE | `/api/groups/:id/channels/:channelId` | Si | Eliminar canal |

### Mensajes

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/messages/group/:id` | Si | Mensajes de grupo/canal |
| GET | `/api/messages/direct/:userId` | Si | DM con usuario |
| DELETE | `/api/messages/:id` | Si | Eliminar mensaje propio |

### Contactos

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| GET | `/api/contacts` | Si | Mis contactos |
| POST | `/api/contacts` | Si | Agregar contacto |
| DELETE | `/api/contacts/:id` | Si | Eliminar contacto |

### Archivos

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| POST | `/api/files/upload` | Si | Subir archivo a S3 |
| GET | `/api/files/signed-url/*` | Si | URL firmada S3 |

### Sistema

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/health` | Healthcheck |
| GET | `/metrics` | Metricas Prometheus |

---

## WebSocket (Socket.IO)

Conexion con token JWT:

```js
const socket = io(BACKEND_URL, { auth: { token } })
```

### Eventos cliente -> servidor

| Evento | Payload | Descripcion |
|---|---|---|
| `join_group` | `{ groupId }` | Unirse a sala de grupo |
| `join_channel` | `{ channelId }` | Unirse a sala de canal |
| `send_message` | `{ groupId, channelId, content, type }` | Enviar mensaje grupal |
| `send_direct` | `{ receiverId, content, type }` | Enviar DM |
| `typing` | `{ groupId, channelId }` | Indicador de escritura |

### Eventos servidor -> cliente

| Evento | Descripcion |
|---|---|
| `new_message` | Nuevo mensaje en grupo/canal |
| `new_direct_message` | Nuevo DM recibido |
| `user_online` | Usuario se conecta |
| `user_offline` | Usuario se desconecta |
| `typing` | Alguien esta escribiendo |

---

## gRPC Services

Definiciones en `proto/messages.proto` y `proto/groups.proto`.

### MessagesService (:50051)

- `SaveMessage(MessageRequest)` - persiste mensaje
- `GetMessages(GetMessagesRequest)` - historial grupal
- `GetDirectMessages(GetDirectRequest)` - historial DM

### GroupsService (:50052)

- `GetGroup(GroupRequest)` - detalles de grupo
- `GetMembers(GroupRequest)` - miembros del grupo
- `AddMember(AddMemberRequest)` - agregar miembro
- `GetChannels(GroupRequest)` - canales del grupo

---

## Eventos RabbitMQ

- Exchange: `groupsapp.events` (tipo `topic`)
- Routing key `message.sent`: backend publica al recibir mensaje via Socket.IO; messages-service consume para persistir en DB

---

## Tests

```bash
cd backend && npm test
cd messages-service && npm test
cd groups-service && npm test
```

Cobertura: autenticacion, upload de archivos, grupos CRUD, mensajes, contactos.

---

## Estructura del Proyecto

```
GroupsApp/
├── backend/
│   ├── src/
│   │   ├── config/         # db.js, redis.js, s3.js
│   │   ├── middleware/     # auth.js, upload.js
│   │   ├── routes/         # auth, groups, channels, messages, contacts, files
│   │   └── socket/         # chat.js, presence.js
│   └── migrations/
├── frontend/
│   └── src/
│       ├── components/     # chat/, groups/, layout/, ui/
│       ├── pages/          # Login, Register, Chat
│       ├── context/        # AuthContext, SocketContext
│       └── services/       # api.js
├── messages-service/
├── groups-service/
├── proto/                  # messages.proto, groups.proto
├── k8s/                    # manifests EKS
├── docker-compose.yml
└── eks-cluster.yaml
```

---

## Entregables

| Entregable | Archivo / URL |
|---|---|
| Informe tecnico | `InformeTecnico.md` |
| Aplicacion desplegada | URL del LoadBalancer EKS (ver equipo) |
| Video demo | (por entregar) |

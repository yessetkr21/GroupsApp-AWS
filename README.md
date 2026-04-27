<div align="center">

# GroupsApp

### Sistema de mensajeria instantanea distribuido

Aplicacion tipo WhatsApp / Telegram construida sobre microservicios contenerizados en **AWS EKS**, con comunicacion REST, WebSocket, gRPC y RabbitMQ.

Node.js · React · Kubernetes (EKS) · MySQL · RabbitMQ · Redis

**Curso:** Topicos Especiales en Telematica / Sistemas Distribuidos — 2026-1

**Integrantes:** Camilo Sanchez Salinas · Samuel Santamaria · Yessetk Rodriguez

</div>

---

## Capturas del Proyecto

<div align="center">

<table>
  <tr>
    <td align="center">
      <img src="img/frontend.png" alt="Pantalla de login" width="480"/>
      <br/>
      <sub><b>Autenticacion — pantalla de login</b></sub>
    </td>
    <td align="center">
      <img src="img/frontend-chats.png" alt="Vista de mensajes directos y contactos" width="480"/>
      <br/>
      <sub><b>Mensajes directos con presencia online y envio de archivos</b></sub>
    </td>
  </tr>
</table>

</div>

---

## Arquitectura

```
                        Internet
                            |
                  AWS Elastic Load Balancer
                            |
              +-------------+-------------+
              |                           |
       [frontend :80]             [backend :3000]
        React + Nginx               Express + Socket.IO
                                          |
                +-------------------------+-------------------------+
                |                         |                         |
          [RabbitMQ]                  [Redis]                 [RDS MySQL]
           AMQP broker              cache / presencia         datos principales
                |
        +-------+-------+
        |               |
 [messages-service]  [groups-service]
    :50051 gRPC          :50052 gRPC
    AMQP consumer        AMQP consumer
                                |
                              [S3]
                        archivos / imagenes
```

### Stack tecnologico

| Capa | Tecnologia |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui, Socket.IO |
| Backend | Node.js, Express, Socket.IO, gRPC, amqplib |
| Base de datos | MySQL 8 (AWS RDS), Redis 7 |
| Infraestructura | Docker, Kubernetes (AWS EKS), Nginx, Prometheus |
| Almacenamiento | AWS S3 |
| Autenticacion | JWT + bcrypt |

### Servicios desplegados en EKS

| Servicio | Stack | Puerto | Rol |
|---|---|---|---|
| `frontend` | React + Nginx | 80 | SPA |
| `backend` | Node.js + Express + Socket.IO | 3000 | API REST, WebSocket, AMQP publisher |
| `messages-service` | Node.js + gRPC | 50051 | Historial mensajes, AMQP consumer |
| `groups-service` | Node.js + gRPC | 50052 | Grupos, canales, miembros |
| `rabbitmq` | RabbitMQ 3.13 | 5672 / 15672 | Message broker |
| `redis` | Redis 7 | 6379 | Cache, presencia online |

### Protocolos de comunicacion

| Canal | Protocolo | Uso |
|---|---|---|
| Cliente <-> Backend | REST HTTP | Operaciones CRUD |
| Cliente <-> Backend | WebSocket (Socket.IO) | Mensajeria en tiempo real |
| Backend <-> Microservicios | gRPC | Consultas internas |
| Backend -> RabbitMQ | AMQP publish | Evento `message.sent` |
| RabbitMQ -> Microservicios | AMQP consume | Persistir mensajes en DB |

---

## Funcionalidades

- Registro y login con JWT + bcrypt
- Grupos con roles admin / member y modos de suscripcion (open, request, invite)
- Canales dentro de grupos
- Mensajeria grupal (grupo/canal) y directa (DM)
- Presencia online/offline en tiempo real via Redis
- Envio de archivos e imagenes almacenados en S3
- Historial persistente de mensajes
- Gestion de contactos
- Eliminacion de grupos y mensajes propios
- Alta disponibilidad: 2 replicas de backend con HPA

---

## Modelo de Datos

```sql
users           -- id, username, email, password_hash, profile_picture, is_online, last_seen
groups          -- id, name, description, created_by, join_mode, is_public
group_members   -- group_id, user_id, role (admin|member), joined_at
channels        -- id, group_id, name, description, created_by
group_messages  -- id, sender_id, group_id, channel_id, content, message_type, file_url
messages        -- id, sender_id, receiver_id, content, message_type, file_url  (DMs)
contacts        -- id, user_id, contact_user_id
message_reads   -- message_id, user_id, read_at
```

---

## API REST

Prefijo `/api/`. Autenticacion: `Authorization: Bearer <token>`.

Formato de respuesta:
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "descripcion del error" }
```

| Metodo | Endpoint | Auth | Descripcion |
|---|---|---|---|
| POST | `/api/auth/register` | No | Registro |
| POST | `/api/auth/login` | No | Login — retorna JWT |
| GET | `/api/auth/me` | Si | Perfil actual |
| GET | `/api/groups` | Si | Mis grupos |
| POST | `/api/groups` | Si | Crear grupo |
| GET | `/api/groups/:id` | Si | Detalle de grupo |
| DELETE | `/api/groups/:id` | Si | Eliminar grupo (admin) |
| POST | `/api/groups/:id/members` | Si | Agregar miembro |
| DELETE | `/api/groups/:id/members/:userId` | Si | Remover miembro |
| GET | `/api/groups/:id/channels` | Si | Canales del grupo |
| POST | `/api/groups/:id/channels` | Si | Crear canal |
| DELETE | `/api/groups/:id/channels/:channelId` | Si | Eliminar canal |
| GET | `/api/messages/group/:id` | Si | Historial grupal |
| GET | `/api/messages/direct/:userId` | Si | Historial DM |
| DELETE | `/api/messages/:id` | Si | Eliminar mensaje propio |
| GET | `/api/contacts` | Si | Mis contactos |
| POST | `/api/contacts` | Si | Agregar contacto |
| DELETE | `/api/contacts/:id` | Si | Eliminar contacto |
| POST | `/api/files/upload` | Si | Subir archivo a S3 |
| GET | `/api/files/signed-url/*` | Si | URL firmada S3 |
| GET | `/api/health` | No | Healthcheck |
| GET | `/metrics` | No | Metricas Prometheus |

---

## WebSocket (Socket.IO)

```js
const socket = io(BACKEND_URL, { auth: { token } })
```

| Evento (cliente -> servidor) | Descripcion |
|---|---|
| `join_group` | Suscribirse a sala de grupo |
| `join_channel` | Suscribirse a sala de canal |
| `send_message` | Enviar mensaje grupal |
| `send_direct` | Enviar mensaje directo |
| `typing` | Indicador de escritura |

| Evento (servidor -> cliente) | Descripcion |
|---|---|
| `new_message` | Nuevo mensaje en grupo/canal |
| `new_direct_message` | Nuevo DM recibido |
| `message_deleted` | Mensaje eliminado |
| `user_online` / `user_offline` | Cambio de presencia |

---

## Infraestructura AWS

| Recurso | Configuracion | Rol |
|---|---|---|
| EKS | Cluster K8s, 2x t3.medium, auto-scaling 2-4 | Orquestacion |
| RDS MySQL | db.t3.micro, Single-AZ | Base de datos |
| S3 | Bucket privado + presigned URLs | Archivos |
| ECR | 4 repositorios | Registry de imagenes |
| ELB | LoadBalancer por servicio | Acceso publico |

### Despliegue EKS

```bash
# Crear cluster
eksctl create cluster -f eks-cluster.yaml

# Addons de red
aws eks create-addon --cluster-name groupsapp-cluster --addon-name vpc-cni --region us-east-1
aws eks create-addon --cluster-name groupsapp-cluster --addon-name kube-proxy --region us-east-1
aws eks create-addon --cluster-name groupsapp-cluster --addon-name coredns --region us-east-1

# Kubeconfig
aws eks update-kubeconfig --name groupsapp-cluster --region us-east-1

# Deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml        # crear desde k8s/secret.yaml.template
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Exponer y escalar
kubectl patch service frontend -n groupsapp -p '{"spec":{"type":"LoadBalancer"}}'
kubectl patch service backend  -n groupsapp -p '{"spec":{"type":"LoadBalancer"}}'
kubectl scale deployment/backend --replicas=2 -n groupsapp
```

> `k8s/secret.yaml` no esta en el repositorio. Crear a partir de `k8s/secret.yaml.template` con los valores en base64.

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
docker compose exec backend node migrations/run.js
```

| Servicio | URL local |
|---|---|
| App | http://localhost |
| RabbitMQ UI | http://localhost:15672 (groupsapp / groupsapp123) |
| Metricas | http://localhost:3000/metrics |

---

## Tests

```bash
cd backend          && npm test
cd messages-service && npm test
cd groups-service   && npm test
```

Cobertura: autenticacion, grupos CRUD, canales, mensajes, contactos, upload S3.

---

## Estructura del Proyecto

```
GroupsApp/
├── backend/
│   ├── src/
│   │   ├── config/       # db.js, redis.js, s3.js
│   │   ├── middleware/   # auth.js, upload.js
│   │   ├── routes/       # auth, groups, channels, messages, contacts, files
│   │   ├── socket/       # chat.js, presence.js
│   │   └── grpc/         # clients.js
│   └── migrations/
├── frontend/
│   └── src/
│       ├── components/   # chat/, groups/, layout/, ui/
│       ├── pages/        # Login, Register, Chat
│       ├── context/      # AuthContext, SocketContext
│       └── services/     # api.js
├── messages-service/
├── groups-service/
├── imagenes/             # capturas del proyecto
├── k8s/                  # manifests EKS
├── docker-compose.yml
└── eks-cluster.yaml
```

---

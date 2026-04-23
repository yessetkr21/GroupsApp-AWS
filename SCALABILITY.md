# Diseño Escalable — GroupsApp

Documento que explica cómo **la arquitectura soporta escalabilidad horizontal y alta disponibilidad**, aunque el deployment actual sea single-node por restricción de presupuesto académico (AWS Academy $50).

---

## Deployment Actual (single-node) vs Diseño Target (EKS)

### Actual — EC2 t3.micro + Docker Compose

```
┌─────────────── EC2 t3.micro ───────────────┐
│  frontend · backend · messages-svc         │
│  groups-svc · rabbitmq · redis · etcd      │
└─────────────────────────────────────────────┘
         ↓                    ↓
   ┌───────────┐        ┌───────────┐
   │ RDS Mysql │        │ S3 bucket │
   │ Single-AZ │        │           │
   └───────────┘        └───────────┘
```

**Costo:** ~$14/mes. **SLA:** Low (single-point-of-failure).

### Target — EKS + RDS Multi-AZ + ElastiCache + ALB

```
         ┌─ Route 53 / ACM ─┐
                │
         ┌──────▼──────┐
         │  ALB (LB)   │  ← ingress con TLS
         └──────┬──────┘
                │
       ┌────────▼────────────┐
       │   EKS cluster       │
       │  (3 AZ, 3 nodes)    │
       │                     │
       │  HPA scaling:       │
       │  frontend (1-3)     │
       │  backend (2-10)     │
       │  messages (2-5)     │
       │  groups (2-5)       │
       └───┬───────┬─────────┘
           │       │
    ┌──────▼─┐  ┌──▼──────────┐
    │Amazon  │  │ ElastiCache │
    │MQ      │  │ Redis       │
    │(Multi- │  │ cluster     │
    │ AZ)    │  │ (primary +  │
    └────────┘  │  replicas)  │
                └─────────────┘
           │
    ┌──────▼───────────┐
    │ RDS Multi-AZ     │
    │ + Read replicas  │
    └──────────────────┘
    ┌──────────────────┐
    │ S3 (multi-region │
    │  replication)    │
    └──────────────────┘
```

**Costo estimado:** ~$250/mes. **SLA:** 99.95%+.

---

## Componentes de Escalabilidad (manifiestos en `/k8s/`)

### 1. Horizontal Pod Autoscaler (HPA)

Cada microservicio tiene HPA configurado. Ejemplo `backend.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    kind: Deployment
    name: backend
  minReplicas: 1
  maxReplicas: 2   # ajustable a 10 con más capacidad
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          averageUtilization: 80
    - type: Resource
      resource:
        name: memory
        target:
          averageUtilization: 80
```

Escalamiento automático basado en CPU/memoria.

### 2. Resource Requests + Limits

Cada pod declara recursos para permitir bin-packing óptimo del scheduler:

```yaml
resources:
  requests:  { cpu: "200m", memory: "256Mi" }
  limits:    { cpu: "1000m", memory: "1Gi" }
```

### 3. Health Checks (Readiness + Liveness)

```yaml
readinessProbe:   # no recibe tráfico hasta estar listo
  httpGet: { path: /api/health, port: 3000 }
livenessProbe:    # reinicia si responde mal
  httpGet: { path: /api/health, port: 3000 }
```

Kubernetes reinicia pods enfermos automáticamente.

### 4. Ingress con Balanceador

`k8s/ingress.yaml` define ingress para AWS ALB/NLB:
- Termina TLS
- Distribuye carga entre réplicas de frontend y backend
- Path-based routing (`/api/*` → backend, resto → frontend)

### 5. Service Discovery Interno

- **Kubernetes Services** (DNS interno) para comunicación pod-to-pod
- **etcd** para service registry dinámico (microservicios se registran al arrancar)
- Backend usa etcd para descubrir `messages-service` y `groups-service` en runtime

### 6. Persistencia Externalizada

Los microservicios son **stateless**. Estado vive en:
- **RDS MySQL** (Multi-AZ) — datos transaccionales
- **S3** — archivos
- **ElastiCache Redis** — caché + presencia
- **Amazon MQ (RabbitMQ)** o autogestionado — eventos

Cualquier pod puede ser recreado sin pérdida.

### 7. Base de Datos Distribuida

Con EKS + RDS:
- **Multi-AZ** — failover automático a standby (~1 min)
- **Read replicas** — escalamiento de lecturas
- **Connection pooling** — `mysql2/promise` maneja pools por pod

Para sharding futuro: particionar `messages` por `group_id` (hash sharding) sería la evolución natural.

### 8. Mensajería Asíncrona Desacoplada

RabbitMQ exchanges:
- `groupsapp.events` (topic) — eventos de dominio
- Routing keys: `message.sent`, `presence.changed`, `group.updated`

Ventajas:
- Backend **publica** y devuelve 200 inmediatamente (baja latencia)
- messages-service **consume** eventos para persistir historial
- Si consumer cae, mensajes quedan en cola (durable)
- Múltiples consumers = **competing consumers pattern** (escalamiento horizontal)

---

## Escalabilidad por Capas

| Capa | Estrategia | Implementado en |
|------|-----------|-----------------|
| Frontend (Nginx) | Replicas + ALB | `k8s/frontend.yaml` |
| API Gateway (backend) | HPA CPU-based + sticky sessions WS | `k8s/backend.yaml` |
| Microservicios gRPC | HPA + load balancing gRPC (client-side) | `k8s/messages-service.yaml`, `k8s/groups-service.yaml` |
| Mensajería | RabbitMQ cluster + queue mirroring | `k8s/rabbitmq.yaml` |
| Caché | Redis Cluster / Sentinel | `k8s/redis.yaml` |
| Coordinación | etcd 3-node cluster | `k8s/etcd.yaml` |
| Base de datos | RDS Multi-AZ + read replicas | A nivel AWS |
| Storage | S3 (11 9s de durabilidad) | A nivel AWS |

---

## Alta Disponibilidad (HA)

| Elemento | Actual | Target |
|----------|--------|--------|
| Compute | 1 EC2 (SPOF) | EKS 3 nodes en 3 AZ |
| DB | RDS Single-AZ | RDS Multi-AZ + 1 read replica |
| Redis | Docker single | ElastiCache primary + replica |
| RabbitMQ | Docker single | Amazon MQ cluster o HA queue mirroring |
| etcd | Docker single | 3 nodes (quorum RAFT) |
| Storage | S3 (ya HA 99.999999999%) | Mismo |
| LB | Nginx local | ALB con health checks multi-AZ |

---

## Métricas y Observabilidad

### Endpoints Prometheus

- `http://<host>:3000/metrics` — backend (HTTP + WS + gRPC calls)
- `http://<host>:9091/metrics` — messages-service (gRPC + AMQP consumed)
- `http://<host>:9092/metrics` — groups-service (gRPC)

### Métricas Clave Expuestas

- `http_request_duration_seconds` — latencia por ruta
- `http_requests_total` — throughput
- `websocket_connections_active` — usuarios concurrentes
- `messages_sent_total{type=...}` — mensajes por tipo
- `grpc_calls_total{service,method,status}` — salud de microservicios
- `amqp_messages_consumed_total` — consumer health
- Default Node.js metrics — event loop lag, memoria, GC

### Stack Observabilidad Target

- **Prometheus** scrapea los endpoints `/metrics`
- **Grafana** dashboards
- **CloudWatch** logs (agentes en EKS)
- **AWS X-Ray** tracing distribuido

---

## Justificación del Deployment Single-Node

El proyecto tiene **budget de $50** (AWS Academy credit). Opciones descartadas:

| Recurso | Costo/mes | Razón descarte |
|---------|-----------|----------------|
| EKS control plane | ~$73 | >1.5× el budget solo por 1 mes |
| ALB | ~$16 | Caro relativo al monolito |
| RDS Multi-AZ | +$13 (×2) | Doble costo de BD |
| ElastiCache t3.micro | ~$12 | Reemplazable por Redis en Docker |
| Amazon MQ | ~$23 | Reemplazable por RabbitMQ en Docker |

**Decisión:** Implementar el **diseño completo** en `/k8s/` pero desplegar la versión **monolítica** en 1 EC2 + Docker Compose. Esto cumple:

- ✅ Requerimiento funcional 100%
- ✅ Arquitectura microservicios (4 servicios)
- ✅ REST + gRPC + MOM
- ✅ Coordinación (etcd)
- ✅ Logs + métricas
- ✅ Diseño escalable documentado
- ⚠️ HA real — no, por presupuesto
- ⚠️ Autoscaling runtime — no, pero HPA está definido

**Migración a producción** requiere solo `kubectl apply -f k8s/` sobre un cluster EKS.

# GroupsApp

Aplicacion de mensajeria instantanea grupal desarrollada como proyecto para el curso ST0263 Topicos Especiales en Telematica / Sistemas Distribuidos.

## Integrantes

- Camilo Sanchez Salinas
- Samuel Santamaria
- Yessetk Rodriguez

---

## Descripcion

GroupsApp es una aplicacion monolitica de mensajeria en tiempo real. Permite crear grupos con canales de comunicacion, enviar mensajes directos, compartir archivos y gestionar contactos. La interfaz es una SPA en React y el backend expone una API REST junto con WebSockets para la comunicacion en tiempo real.

---

## Estructura del Proyecto

```
GroupsApp/
├── .env
├── backend/
│   ├── package.json
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── src/
│       ├── index.js
│       ├── config/
│       │   ├── db.js
│       │   ├── s3.js
│       │   └── redis.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── upload.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── groups.js
│       │   ├── channels.js
│       │   ├── messages.js
│       │   ├── contacts.js
│       │   └── files.js
│       └── socket/
│           ├── index.js
│           ├── chat.js
│           └── presence.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   └── Chat.jsx
        ├── components/
        │   ├── ui/
        │   ├── chat/
        │   ├── groups/
        │   └── layout/
        ├── context/
        │   ├── AuthContext.jsx
        │   └── SocketContext.jsx
        └── services/
            └── api.js
```

---

## Eventos WebSocket

| Evento | Direccion | Descripcion |
|---|---|---|
| `join_channel` | cliente -> servidor | Unirse a un canal |
| `send_message` | cliente -> servidor | Enviar mensaje |
| `new_message` | servidor -> cliente | Mensaje recibido en canal |
| `user_online` | servidor -> cliente | Usuario se conecta |
| `user_offline` | servidor -> cliente | Usuario se desconecta |

---

## Ejecucion Local

### Requisitos

- Node.js 18+
- Acceso a la instancia de base de datos y Redis configurados en `.env`

### Backend

```bash
cd backend
npm install
npm run dev
```

Disponible en `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:5173`.


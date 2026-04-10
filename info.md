Objetivo General: 
Diseñar,  implementar  y  desplegar  en  AWS  una  aplicación  de  mensajería  instantánea 
llamada GroupsApp similar a WhatsApp o Telegram con arquitectura distribuida, 
altamente escalable y tolerable a fallos, integrando comunicación síncrona (REST y gRPC), 
comunicación asíncrona (Kafka o RabbitMQ), datos distribuidos con replicación y 
particionamiento, y coordinación distribuida, entre otros retos de sistemas distribuidos 
 
Descripción del Proyecto: 
Se desea implementar un sistema de mensajería instantánea que permite a un grupo de 
personas intercambiar mensajes, archivos, y opcionalmente otros tipos de medios como 
mensajes  de  voz,  o  video  (no  llamadas  de  audio  o  video  en  línea).  El  fuerte  de  esta 
aplicación  son  los  grupos  y  no  tanto  las  comunicaciones  uno  a  uno  (como  nacido 
whatsapp), si bien puede haber comunicaciones uno a uno, con las restricciones que uds 
definan,  por  ejemplo,  comunicaciones  privadas  uno  a  uno  dentro  de  un  grupo,  o 
comunicaciones  con  consentimiento  entre  cualquier  par  de  usuarios,  siempre  que  se 
conozcan  los  userid.  A  propósito,  cada  grupo  tendrá  un  groupid  único  en  el  sistema 
(dentro de un grupo se pueden tener subgrupos o canales, cada uno con su channelid. 
La funcionalidad mínima que se espera es poder enviar y recibir mensajes en un grupo, 
canal o usuario, poder enviar y recibir archivos, y conocer el estado de entrega y lectura 
de los mensajes (como los 2 chulitos de whatsapp) 
 
Requerimientos Funcionales: 
1. Registro y autenticación de usuarios. 
2. creación y gestión de grupos (todo grupo tiene al menos un administrador, que 
configura diferentes opciones de suscripción al grupo) 
3. creación y gestión de contactos de mis grupos 
4. Mensajería en grupo (1-n) y persona a persona con las restricciones antes 
mencionada 1–1 (envío y recepción) 
2 
 
5. Persistencia de mensajes e historial  
6. Estado de presencia (online/offline) y lectura 
7. envió y recepción de archivos e imágenes visualizadas. 
8. otros que se irán agregando o aclarando. 
 
Requerimientos NO funcionales  
1. Arquitectura basada en microservicios (mínimo 3 servicios) 
2. comunicaciones sincrónicas y/o asincrónicas basadas en: 
● API REST para operaciones externas 
● gRPC para comunicación interna o streaming 
● MOM (Kafka o RabbitMQ) para eventos y desacople. Las comunicaciones 
basadas en mensajería son muy adecuadas para este tipo de aplicaciones de 
mensajería instantánea. 
3. - Bases de datos distribuidas y/o sistemas de archivos distribuidos 
(Particionamiento,  replicación de datos, consistencia, transacciones, etc) 
4. - Servicio de coordinación (etcd, Consul o equivalente) 
5. - Despliegue en AWS (preferiblemente en un clúster kubernetes tipo EKS) 
6. - Ingress con balanceador de cargas 
7. - Autoescalado y alta disponibilidad (HA) 
8. - Gestión de logs y métricas básicas 
9. Otros que se irán agregando o aclarando 
Entregables 
1. Informe técnico (PDF) con arquitectura, APIs, modelo de datos y pruebas. 
2. Repositorio GitHub documentado. 
3. Video demo (10–15 minutos). 
4. Aplicación desplegada en nube 
Criterios de Evaluación 
1. Aplicación monolítica funcional (20%) – diseño e implementación (1 solo servidor 
en AWS) 
2. Diseño arquitectónico escalable, del sistema distribuido y diseño del despliegue 
de la aplicación en nube (servicios a utilizar, tipo: IaaS, PaaS). 20% 
3. Diseño e implementación de los datos de la aplicación (BD, archivos, logs, etc). 
20% 
2 
 
5. Persistencia de mensajes e historial  
6. Estado de presencia (online/offline) y lectura 
7. envió y recepción de archivos e imágenes visualizadas. 
8. otros que se irán agregando o aclarando. 
 
Requerimientos NO funcionales  
1. Arquitectura basada en microservicios (mínimo 3 servicios) 
2. comunicaciones sincrónicas y/o asincrónicas basadas en: 
● API REST para operaciones externas 
● gRPC para comunicación interna o streaming 
● MOM (Kafka o RabbitMQ) para eventos y desacople. Las comunicaciones 
basadas en mensajería son muy adecuadas para este tipo de aplicaciones de 
mensajería instantánea. 
3. - Bases de datos distribuidas y/o sistemas de archivos distribuidos 
(Particionamiento,  replicación de datos, consistencia, transacciones, etc) 
4. - Servicio de coordinación (etcd, Consul o equivalente) 
5. - Despliegue en AWS (preferiblemente en un clúster kubernetes tipo EKS) 
6. - Ingress con balanceador de cargas 
7. - Autoescalado y alta disponibilidad (HA) 
8. - Gestión de logs y métricas básicas 
9. Otros que se irán agregando o aclarando 
Entregables 
1. Informe técnico (PDF) con arquitectura, APIs, modelo de datos y pruebas. 
2. Repositorio GitHub documentado. 
3. Video demo (10–15 minutos). 
4. Aplicación desplegada en nube 
Criterios de Evaluación 
1. Aplicación monolítica funcional (20%) – diseño e implementación (1 solo servidor 
en AWS) 
2. Diseño arquitectónico escalable, del sistema distribuido y diseño del despliegue 
de la aplicación en nube (servicios a utilizar, tipo: IaaS, PaaS). 20% 
3. Diseño e implementación de los datos de la aplicación (BD, archivos, logs, etc). 
20% 
3 
 
4. Comunicaciones remotas 20% 
● Definición, Especificación e Implementación de Comunicaciones API REST + 
gRPC + MOM 
5. Otros aspectos del sistema distribuido 20%: 
● servicios de coordinación 
● servicios de gestión de la configuración 
● servicio de nombres 
● escalabilidad en usuarios 
● pruebas 
● seguridad básica. 
6. Aplicación Distribuida Escalable funcional (20%), se mide por el nivel de 
cumplimiento en implementación de los numerales 2, 3, 4 y 5.
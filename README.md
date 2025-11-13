# GHL Floating Conversations

Script de uso interno para abrir **conversaciones flotantes** de GoHighLevel
directamente desde el módulo de Oportunidades, sin salir de la pantalla.

Cada contacto tiene un ícono de “avión de papel” que, al hacer clic, abre una
ventana flotante con:

- Historial de mensajes (SMS / WhatsApp / etc.)
- Selector de canal para responder
- Área de texto para enviar nuevos mensajes
- Actualización automática de la conversación
- Cierre automático configurable de la ventana

---

## Características

- 💬 **Ventanas flotantes y movibles**  
  Puedes arrastrar la ventana dentro del viewport y cambiar su tamaño (resize).

- 🧵 **Historial de conversación**  
  Carga hasta `MSG_LIMIT` mensajes y los muestra tipo chat (contacto vs equipo).

- 📎 **Soporte de adjuntos**  
  Si el mensaje tiene archivos (imagen, video, audio, otros) se muestran como
  enlaces “Ver imagen / Ver video / Escuchar audio / Ver archivo”.

- 🔁 **Refresco automático**  
  La conversación se actualiza automáticamente cada X segundos
  (por defecto cada 15s). Este intervalo se controla por una constante en el
  script.

- ⏱ **Cierre automático de ventanas**  
  Cada ventana puede cerrarse sola en:
  `1, 3, 5, 10 minutos` o quedar en `OFF` (manual).  
  Si está activo, se muestra un cintillo verde informando el tiempo restante.  
  Si está en `OFF`, se muestra un cintillo rojo claro con un botón
  **"Actualizar ahora"**.

- 🔗 **Atajo a la conversación en GHL**  
  Botón de “abrir en nueva pestaña” que lleva a:
  `https://app.gohighlevel.com/v2/location/{locationId}/conversations/conversations/{conversationId}`

---

## Requisitos

- Una cuenta de GoHighLevel con acceso a:
  - Contactos
  - Conversaciones
- Un **API Key / Token** válido para cada `locationId` que vayas a usar.
- Un repositorio de GitHub con **GitHub Pages** habilitado para servir el
  archivo `ghl-float.js`.

---

## Estructura del repositorio

Este repo es muy simple:

```text
/
├─ ghl-float.js        # Script principal de la ventana flotante
└─ README.md           # Este archivo

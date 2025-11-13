
(() => {
  "use strict";
  if (window.__GHL_FLOAT_CHAT_V2__) return;
  window.__GHL_FLOAT_CHAT_V2__ = true;

  /* =========================
   *  CONFIG GLOBAL
   * ========================= */

  // ⏱ Intervalo de refresco automático de mensajes (en ms)
  const REFRESH_INTERVAL_MS = 15000; // 15 segundos

  // 🎯 Límite de mensajes por carga
  const MSG_LIMIT = 50;

  // 🔐 Base API / proxy
  const API_BASE = "https://services.leadconnectorhq.com";
  const CONTACT_VERSION = "2021-07-28";
  const CONV_VERSION = "2021-04-15";
  const USE_PROXY = false;
  const PROXY_URL = "https://tu-proxy.com/ghl"; // opcional

  const CHANNELS = [
    ["SMS", "SMS"],
    ["WhatsApp", "WHATSAPP"],
    ["Instagram", "INSTAGRAM"],
    ["Facebook", "FACEBOOK"],
  ];

  const WRAP_CLASS   = "ghl-opp-card-wrap";
  const BTN_INLINE   = "ghl-opp-send-icon-inline";
  const BTN_FALLBACK = "ghl-opp-sendbtn-fallback";

  const STYLE_ID = "ghl-floating-conv-style";

  // === Tomar datos del <script> que carga este archivo ===
  const SCRIPT_EL = document.currentScript || (() => {
    const scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1] || null;
  })();

  const LOCATION_ID_ATTR = SCRIPT_EL?.dataset.locationId || null;
  const TOKEN_ATTR       = SCRIPT_EL?.dataset.token || null;

  // ids base para ventanas
  let FLOAT_COUNTER = 0;
  const OPEN_WINDOWS = new Map(); // key: floatId -> state

  // locationId desde URL o data-attribute
  const getLocationId = () =>
    LOCATION_ID_ATTR ||
    (location.pathname.match(/\/location\/([^/]+)/) || [])[1] ||
    null;

  /* =========================
   *  ESTILOS
   * ========================= */

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      .${WRAP_CLASS}{
        position: relative !important;
      }

      /* Solo las tarjetas con botón flotante tendrán espacio extra abajo */
      .${WRAP_CLASS}.has-floating-btn{
        padding-bottom: 44px !important;
      }
      .${BTN_FALLBACK}{
        position: absolute !important;
        right: 10px;
        bottom: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        border: 1px solid #d0d5dd;
        background: #0ea5e9;
        color: #fff;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        z-index: 50;
      }
      .${BTN_FALLBACK}:hover{ filter: brightness(.93); }
      .${BTN_FALLBACK} svg{ width:16px; height:16px; }

      .${BTN_INLINE} svg{
        width: 16px;
        height: 16px;
        color: #6b7280;
      }
      .${BTN_INLINE}{
        display: inline-flex;
        align-items: center;
      }

      /* ==== Ventana flotante ==== */
      .ghl-float-backdrop{
        position: fixed;
        inset: 0;
        pointer-events:none;
        z-index: 100000;
      }
      .ghl-float-window{
        position: absolute;
        width: 720px;
        max-width: calc(100vw - 40px);
        height: 560px;
        max-height: calc(100vh - 40px);
        background: #fff;
        border-radius: 18px;
        box-shadow: 0 22px 60px rgba(15,23,42,0.32);
        display: flex;
        flex-direction: column;
        pointer-events:auto;
        overflow:hidden;
        resize: both;
      }
      .ghl-float-header{
        flex: 0 0 auto;
        padding: 10px 16px 8px 14px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        border-bottom:1px solid #e5e7eb;
        cursor:move;
        user-select:none;
      }
      .ghl-float-header-left{
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
      }
      .ghl-float-avatar{
        width:32px;
        height:32px;
        border-radius:999px;
        background:#fee2e2;
        color:#b91c1c;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:13px;
        font-weight:600;
        flex-shrink:0;
      }
      .ghl-float-name{
        font-weight:600;
        font-size:15px;
        color:#0f172a;
        max-width:260px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .ghl-float-header-right{
        display:flex;
        align-items:center;
        gap:6px;
      }
      .ghl-icon-btn{
        width:34px;
        height:34px;
        border-radius:12px;
        border:1px solid #e5e7eb;
        background:#f9fafb;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
      }
      .ghl-icon-btn svg{
        width:16px;
        height:16px;
        color:#4b5563;
      }
      .ghl-icon-btn:hover{
        background:#eef2ff;
        border-color:#c7d2fe;
      }
      .ghl-close-btn{
        padding:8px 16px;
        border-radius:12px;
        border:1px solid #e5e7eb;
        background:#f9fafb;
        cursor:pointer;
        font-size:14px;
      }
      .ghl-close-btn:hover{
        background:#f3f4f6;
      }

      /* Cintas de estado */
      .ghl-float-banner{
        flex: 0 0 auto;
        padding:6px 14px;
        font-size:13px;
      }
      .ghl-banner-auto{
        background:#d1fadf;
        color:#166534;
        border-bottom:1px solid #a7f3d0;
      }
      .ghl-banner-manual{
        background:#fee2e2;
        color:#b91c1c;
        border-bottom:1px solid #fecaca;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }
      .ghl-banner-manual button{
        border-radius:999px;
        border:1px solid #fecaca;
        background:#fee2e2;
        padding:4px 10px;
        cursor:pointer;
        font-size:12px;
      }
      .ghl-banner-manual button:hover{
        background:#fecaca;
      }

      /* Cuerpo */
      .ghl-float-body{
        flex: 1 1 auto;
        display:flex;
        flex-direction:column;
        padding:10px 16px 12px 16px;
        gap:8px;
        overflow:hidden;
        background:#f9fafb;
      }

      .ghl-thread{
        flex:1 1 auto;
        border-radius:14px;
        background:#f9fafb;
        border:1px solid #e5e7eb;
        padding:10px 10px;
        overflow-y:auto;
        display:flex;
        flex-direction:column;
        gap:6px;
      }
      .ghl-thread-empty{
        font-size:13px;
        color:#6b7280;
        text-align:center;
        padding:20px 0;
      }
      .ghl-msg-row{
        display:flex;
      }
      .ghl-msg-row.inbound{ justify-content:flex-start; }
      .ghl-msg-row.outbound{ justify-content:flex-end; }

      .ghl-msg-bubble{
        max-width:78%;
        padding:8px 11px;
        border-radius:14px;
        font-size:13px;
        line-height:1.35;
        white-space:pre-wrap;
        word-break:break-word;
        display:flex;
        flex-direction:column;
        gap:3px;
      }
      .ghl-msg-bubble.inbound{
        background:#e5e7eb;
        color:#111827;
        border-bottom-left-radius:4px;
      }
      .ghl-msg-bubble.outbound{
        background:#2563eb;
        color:#fff;
        border-bottom-right-radius:4px;
      }
      .ghl-msg-meta{
        font-size:11px;
        opacity:0.8;
        text-align:right;
      }
      .ghl-msg-bubble.inbound .ghl-msg-meta{ color:#6b7280; }
      .ghl-msg-bubble.outbound .ghl-msg-meta{ color:#dbeafe; }

      .ghl-attachment{
        margin-top:4px;
        font-size:12px;
        text-decoration:underline;
        cursor:pointer;
      }

      /* Composer */
      .ghl-composer{
        flex:0 0 auto;
        display:flex;
        align-items:flex-end;
        gap:8px;
        margin-top:4px;
      }
      .ghl-composer-channel{
        min-width:120px;
        border-radius:999px;
        padding:8px 14px;
        font-size:13px;
        border:1px solid #e5e7eb;
        background:#f9fafb;
        cursor:pointer;
        outline:none;
      }
      .ghl-composer-input{
        flex:1;
        display:flex;
      }
      .ghl-composer textarea{
        width:100%;
        border:1px solid #d0d5dd;
        border-radius:16px;
        padding:8px 12px;
        font-size:14px;
        outline:none;
        background:#fff;
        resize:none;
        min-height:40px;
        max-height:160px;
        transition:max-height .15s ease;
      }
      .ghl-composer textarea:focus{
        border-color:#94a3b8;
      }
      .ghl-send-btn{
        width:52px;
        height:52px;
        border-radius:999px;
        border:none;
        background:#2563eb;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        box-shadow:0 8px 20px rgba(37,99,235,0.45);
      }
      .ghl-send-btn svg{
        width:24px;
        height:24px;
        color:#fff;
        transform:translate(1px, -1px);
      }
      .ghl-send-btn:hover{
        background:#1d4ed8;
      }
      .ghl-send-btn:disabled{
        opacity:0.5;
        cursor:default;
        box-shadow:none;
      }

      /* Dropdown timer */
      .ghl-timer-menu{
        position:absolute;
        top:40px;
        right:110px;
        background:#fff;
        border-radius:12px;
        border:1px solid #e5e7eb;
        box-shadow:0 14px 35px rgba(15,23,42,0.25);
        padding:6px 0;
        font-size:13px;
        z-index:100001;
      }
      .ghl-timer-menu button{
        display:block;
        width:100%;
        padding:6px 14px;
        text-align:left;
        border:none;
        background:#fff;
        cursor:pointer;
      }
      .ghl-timer-menu button:hover{
        background:#f3f4f6;
      }
    `;
    document.head.appendChild(s);
  };

  /* =========================
   *  API HELPERS
   * ========================= */

  const apiFetch = (method, path, body, token, version) => {
    return new Promise((resolve, reject) => {
      const url = USE_PROXY ? PROXY_URL : API_BASE + path;
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Version", version || CONV_VERSION);
      if (!USE_PROXY) {
        xhr.setRequestHeader("Authorization", "Bearer " + token);
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null);
            } catch (e) {
              resolve(null);
            }
          } else {
            reject(new Error("HTTP " + xhr.status + "\n" + xhr.responseText));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Error de red o CORS"));
      xhr.send(body ? JSON.stringify(body) : null);
    });
  };

  const fetchContact = (contactId, token) =>
    apiFetch("GET", `/contacts/${contactId}`, null, token, CONTACT_VERSION);

  const searchConversationForContact = (contactId, locId, token) =>
    apiFetch(
      "GET",
      `/conversations/search?locationId=${encodeURIComponent(
        locId
      )}&contactId=${encodeURIComponent(
        contactId
      )}&limit=1&status=all&sort=desc&sortBy=last_message_date`,
      null,
      token,
      CONV_VERSION
    );

  const fetchMessages = (convId, token) =>
    apiFetch(
      "GET",
      `/conversations/${convId}/messages?limit=${MSG_LIMIT}`,
      null,
      token,
      CONV_VERSION
    );

  const sendMessageApi = (payload, token) =>
    apiFetch("POST", "/conversations/messages", payload, token, CONV_VERSION);

  const extractMessages = (resp) => {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.messages)) return resp.messages;
    if (resp.messages && Array.isArray(resp.messages.messages))
      return resp.messages.messages;
    return [];
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    const opts = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    };
    return d.toLocaleString(undefined, opts);
  };

  const getInitials = (contact) => {
    const first = contact?.firstName || "";
    const last = contact?.lastName || "";
    const name = `${first} ${last}`.trim() || contact?.fullName || "";
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return "CT";
    const a = (parts[0][0] || "").toUpperCase();
    const b = (parts[1]?.[0] || "").toUpperCase();
    return (a + b).trim();
  };

  const getFullName = (contact) => {
    const first = contact?.firstName || "";
    const last = contact?.lastName || "";
    if (!first && !last) return contact?.fullName || "Sin nombre";
    return `${first} ${last}`.trim();
  };

  /* =========================
   *  VENTANAS FLOTANTES
   * ========================= */

  const globalBackdrop = (() => {
    const el = document.createElement("div");
    el.className = "ghl-float-backdrop";
    document.body.appendChild(el);
    return el;
  })();

  const createTimerMenu = (winState) => {
    const existing = document.getElementById(winState.ids.timerMenu);
    if (existing) existing.remove();
    const menu = document.createElement("div");
    menu.id = winState.ids.timerMenu;
    menu.className = "ghl-timer-menu";

    const options = [
      { label: "1 minuto", value: 1 },
      { label: "3 minutos", value: 3 },
      { label: "5 minutos", value: 5 },
      { label: "10 minutos", value: 10 },
      { label: "OFF (manual)", value: 0 },
    ];

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent = opt.label;
      btn.onclick = () => {
        menu.remove();
        setAutoClose(winState, opt.value);
      };
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    const rect = winState.dom.window.getBoundingClientRect();
    menu.style.top = rect.top + 42 + "px";
    menu.style.left = rect.right - 140 + "px";
  };

  const closeWindow = (floatId) => {
    const state = OPEN_WINDOWS.get(floatId);
    if (!state) return;
    if (state.refreshInterval) clearInterval(state.refreshInterval);
    if (state.autoCloseTimer) clearTimeout(state.autoCloseTimer);
    state.dom.window.remove();
    OPEN_WINDOWS.delete(floatId);
  };

  const setAutoClose = (winState, minutes) => {
    if (winState.autoCloseTimer) {
      clearTimeout(winState.autoCloseTimer);
      winState.autoCloseTimer = null;
    }
    winState.autoCloseMinutes = minutes;

    if (minutes > 0) {
      winState.dom.banner.className =
        "ghl-float-banner ghl-banner-auto";
      winState.dom.banner.textContent =
        `Esta ventana se cerrará automáticamente en ${minutes} minuto(s).`;

      const ms = minutes * 60 * 1000;
      winState.autoCloseTimer = setTimeout(() => {
        closeWindow(winState.ids.floatId);
      }, ms);
    } else {
      winState.dom.banner.className =
        "ghl-float-banner ghl-banner-manual";
      winState.dom.banner.innerHTML = `
        <span>Actualización automática desactivada. Refresca la conversación manualmente.</span>
        <button type="button">Actualizar ahora</button>
      `;
      const btn = winState.dom.banner.querySelector("button");
      btn.onclick = () => {
        reloadMessages(winState);
      };
    }
  };

  const reloadMessages = async (winState) => {
    const { conversationId, token } = winState;
    if (!conversationId || !token) return;

    winState.loading = true;
    try {
      const data = await fetchMessages(conversationId, token);
      const msgs = extractMessages(data);
      renderThread(winState, msgs, true);
    } catch (e) {
      console.error("Error recargando mensajes", e);
    } finally {
      winState.loading = false;
    }
  };

  const renderThread = (winState, messages, scrollBottom) => {
    const thread = winState.dom.thread;
    thread.innerHTML = "";

    if (!messages || !messages.length) {
      const empty = document.createElement("div");
      empty.className = "ghl-thread-empty";
      empty.textContent = "Este contacto aún no tiene mensajes.";
      thread.appendChild(empty);
      return;
    }

    messages.sort((a, b) => {
      const da = new Date(a.dateAdded || 0).getTime();
      const db = new Date(b.dateAdded || 0).getTime();
      return da - db;
    });

    messages.forEach((msg) => {
      const row = document.createElement("div");
      const dir = msg.direction === "outbound" ? "outbound" : "inbound";
      row.className = `ghl-msg-row ${dir}`;

      const bubble = document.createElement("div");
      bubble.className = `ghl-msg-bubble ${dir}`;

      let body = msg.body || "";
      if (!body && msg.type === 28 && msg.messageType === "TYPE_ACTIVITY_OPPORTUNITY") {
        body = msg.body || "Opportunity updated";
      }

      const textNode = document.createElement("div");
      textNode.textContent = body;
      bubble.appendChild(textNode);

      if (Array.isArray(msg.attachments) && msg.attachments.length) {
        msg.attachments.forEach((url) => {
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.className = "ghl-attachment";
          if (url.match(/\.(png|jpe?g|gif|webp)$/i)) {
            link.textContent = "Ver imagen";
          } else if (url.match(/\.(mp4|mov|webm)$/i)) {
            link.textContent = "Ver video";
          } else if (url.match(/\.(mp3|wav|m4a)$/i)) {
            link.textContent = "Escuchar audio";
          } else {
            link.textContent = "Ver archivo";
          }
          bubble.appendChild(link);
        });
      }

      const meta = document.createElement("div");
      meta.className = "ghl-msg-meta";
      const ts = formatDateTime(msg.dateAdded);
      const fromLabel =
        msg.direction === "outbound"
          ? (msg.userId ? "Equipo" : "Sistema")
          : "Contacto";
      meta.textContent = `${ts} · ${fromLabel}`;
      bubble.appendChild(meta);

      row.appendChild(bubble);
      thread.appendChild(row);
    });

    if (scrollBottom) {
      setTimeout(() => {
        thread.scrollTop = thread.scrollHeight + 1000;
      }, 20);
    }
  };

  const createFloatingWindow = (contact, conversation, token) => {
    ensureStyle();

    const locId = conversation.locationId || getLocationId();
    const floatId = "ghlFloat_" + (++FLOAT_COUNTER);
    const convId = conversation.id;
    const fullName = getFullName(contact);
    const initials = getInitials(contact);

    const win = document.createElement("div");
    win.className = "ghl-float-window";

    const baseTop = window.scrollY + 60 + (OPEN_WINDOWS.size * 30);
    const baseLeft = window.scrollX + 40 + (OPEN_WINDOWS.size * 25);
    win.style.top = baseTop + "px";
    win.style.left = baseLeft + "px";

    const ids = {
      floatId,
      timerMenu: floatId + "_timerMenu",
    };

    const header = document.createElement("div");
    header.className = "ghl-float-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "ghl-float-header-left";

    const avatar = document.createElement("div");
    avatar.className = "ghl-float-avatar";
    avatar.textContent = initials;

    const nameEl = document.createElement("div");
    nameEl.className = "ghl-float-name";
    nameEl.textContent = fullName;
    nameEl.title = fullName;

    headerLeft.appendChild(avatar);
    headerLeft.appendChild(nameEl);

    const headerRight = document.createElement("div");
    headerRight.className = "ghl-float-header-right";

    const btnOpen = document.createElement("button");
    btnOpen.type = "button";
    btnOpen.className = "ghl-icon-btn";
    btnOpen.title = "Ver conversación en GHL";
    btnOpen.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 3h7v7"></path>
        <path d="M10 14L21 3"></path>
        <path d="M5 5H3v16h16v-2"></path>
      </svg>`;
    btnOpen.onclick = () => {
      if (!locId || !convId) return;
      const url = `https://app.gohighlevel.com/v2/location/${locId}/conversations/conversations/${convId}?category=team-inbox&tab=all`;
      window.open(url, "_blank");
    };

    const btnInfo = document.createElement("button");
    btnInfo.type = "button";
    btnInfo.className = "ghl-icon-btn";
    btnInfo.title = `La conversación se actualiza cada ${REFRESH_INTERVAL_MS / 1000} segundos.`;
    btnInfo.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>`;

    const btnClock = document.createElement("button");
    btnClock.type = "button";
    btnClock.className = "ghl-icon-btn";
    btnClock.title = "Configurar cierre automático";
    btnClock.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>`;
    btnClock.onclick = (e) => {
      e.stopPropagation();
      createTimerMenu(winState);
    };

    const btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "ghl-close-btn";
    btnClose.textContent = "Cerrar";
    btnClose.onclick = () => closeWindow(floatId);

    headerRight.appendChild(btnOpen);
    headerRight.appendChild(btnInfo);
    headerRight.appendChild(btnClock);
    headerRight.appendChild(btnClose);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);

    const banner = document.createElement("div");
    banner.className = "ghl-float-banner";

    const body = document.createElement("div");
    body.className = "ghl-float-body";

    const thread = document.createElement("div");
    thread.className = "ghl-thread";

    const composer = document.createElement("div");
    composer.className = "ghl-composer";

    const select = document.createElement("select");
    select.className = "ghl-composer-channel";
    CHANNELS.forEach(([label, value]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    });

    const inputWrap = document.createElement("div");
    inputWrap.className = "ghl-composer-input";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Type a message...";

    textarea.addEventListener("input", () => {
      textarea.style.height = "auto";
      const h = Math.min(160, textarea.scrollHeight);
      textarea.style.height = h + "px";
    });

    inputWrap.appendChild(textarea);

    const btnSend = document.createElement("button");
    btnSend.type = "button";
    btnSend.className = "ghl-send-btn";
    btnSend.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2L11 13"></path>
        <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
      </svg>`;

    composer.appendChild(select);
    composer.appendChild(inputWrap);
    composer.appendChild(btnSend);

    body.appendChild(thread);
    body.appendChild(composer);

    win.appendChild(header);
    win.appendChild(banner);
    win.appendChild(body);

    globalBackdrop.appendChild(win);

    const winState = {
      ids,
      dom: {
        window: win,
        header,
        banner,
        thread,
        textarea,
        select,
        btnSend,
      },
      locationId: locId,
      contact,
      conversationId: convId,
      token,
      refreshInterval: null,
      autoCloseTimer: null,
      autoCloseMinutes: 1,
      loading: false,
    };

    OPEN_WINDOWS.set(floatId, winState);

    setupDrag(win, header);

    setAutoClose(winState, 1);

    if (REFRESH_INTERVAL_MS > 0) {
      winState.refreshInterval = setInterval(() => {
        if (winState.autoCloseMinutes === 0) return;
        reloadMessages(winState);
      }, REFRESH_INTERVAL_MS);
    }

    btnSend.onclick = async () => {
      const msg = (textarea.value || "").trim();
      if (!msg) return;
      btnSend.disabled = true;
      try {
        const payload = {
          contactId: contact.id,
          locationId: locId,
          type: select.value || "SMS",
          message: msg,
        };
        await sendMessageApi(payload, token);
        textarea.value = "";
        textarea.style.height = "40px";
        await reloadMessages(winState);
      } catch (e) {
        console.error("Error al enviar mensaje", e);
        alert("Error al enviar el mensaje: " + (e?.message || e));
      } finally {
        btnSend.disabled = false;
      }
    };

    renderThread(winState, [], false);

    return winState;
  };

  const setupDrag = (win, handle) => {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    const onDown = (e) => {
      if (e.button !== 0) return;
      dragging = true;
      const rect = win.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      win.style.left = Math.max(10, Math.min(maxX, x)) + "px";
      win.style.top = Math.max(10, Math.min(maxY, y)) + "px";
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    handle.addEventListener("mousedown", onDown);
  };

  /* =========================
   *  FLUJO PRINCIPAL
   * ========================= */

  const openFloatingForContact = async (contactId) => {
    ensureStyle();
    const locId = getLocationId();
    const token = TOKEN_ATTR;

    if (!token && !USE_PROXY) {
      alert("No hay token configurado para esta subcuenta.");
      return;
    }

    try {
      const [contactResp, convResp] = await Promise.all([
        fetchContact(contactId, token),
        searchConversationForContact(contactId, locId, token),
      ]);

      const contact = contactResp?.contact || contactResp || {};
      const convList = convResp?.conversations || convResp?.items || [];
      const conversation =
        convList && convList.length ? convList[0] : { id: null, locationId: locId };

      const winState = createFloatingWindow(contact, conversation, token);

      if (conversation.id) {
        const data = await fetchMessages(conversation.id, token);
        const msgs = extractMessages(data);
        renderThread(winState, msgs, true);
      } else {
        renderThread(winState, [], false);
      }
    } catch (e) {
      console.error("Error abriendo ventana flotante", e);
      alert("No se pudo cargar la conversación: " + (e?.message || e));
    }
  };

  /* =========================
   *  INYECCIÓN DE BOTÓN
   * ========================= */

  const makeSvgIcon = () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.innerHTML = `
      <path d="M22 2L11 13"></path>
      <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
    `;
    svg.style.cursor = "pointer";
    svg.style.color = "#6b7280";
    return svg;
  };

  const injectButtons = () => {
    ensureStyle();
    document.querySelectorAll("div[data-contact-id]").forEach((header) => {
      const contactId = header.getAttribute("data-contact-id");
      if (!contactId) return;

      const card =
        header.closest(".opportunitiesCard") ||
        header.closest(".ui-card") ||
        header.closest("[data-v-3198effe]") ||
        header.closest(".ui-card-content");

      if (!card) return;

      if (!card.classList.contains(WRAP_CLASS)) {
        card.classList.add(WRAP_CLASS);
      }

      if (
        card.querySelector("." + BTN_INLINE) ||
        card.querySelector("." + BTN_FALLBACK)
      ) return;

      let iconRow = null;
      const rows = card.querySelectorAll("div.flex");
      rowsLoop:
      for (const row of rows) {
        const inlineItems = row.querySelectorAll(".inline-flex.items-center");
        const svgs = row.querySelectorAll("svg");
        if (inlineItems.length > 0 && svgs.length > 0) {
          iconRow = row;
          break rowsLoop;
        }
      }

      if (iconRow) {
        const wrap = document.createElement("div");
        wrap.className = `inline-flex items-center ${BTN_INLINE}`;
        const holder = document.createElement("div");
        holder.className = "mb-0.5 mt-2.5 flex h-3.5";
        const inner = document.createElement("div");
        const svg = makeSvgIcon();
        svg.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openFloatingForContact(contactId);
        });
        inner.appendChild(svg);
        holder.appendChild(inner);
        wrap.appendChild(holder);
        iconRow.appendChild(wrap);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = BTN_FALLBACK;
        btn.title = "Ver conversación flotante";
        const svg = makeSvgIcon();
        btn.appendChild(svg);
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openFloatingForContact(contactId);
        });
        card.appendChild(btn);
      }
    });
  };

  const debounce = (fn, ms = 150) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const handle = debounce(injectButtons, 200);
  const observer = new MutationObserver(handle);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  ["pushState","replaceState"].forEach((fn) => {
    try {
      const orig = history[fn];
      history[fn] = function () {
        const ret = orig.apply(this, arguments);
        window.dispatchEvent(new Event("ghl:navigation"));
        return ret;
      };
    } catch {}
  });
  window.addEventListener("popstate", () => window.dispatchEvent(new Event("ghl:navigation")));
  window.addEventListener("ghl:navigation", handle);

  handle();
  setTimeout(handle, 500);
  setTimeout(handle, 1000);


 // === Exponer función global para que otros scripts puedan abrir la ventana ===
  window.ghlOpenFloatingConversation = function(contactId) {
    try {
      openFloatingForContact(contactId);
    } catch (e) {
      console.error("Error al abrir ventana flotante desde global:", e);
    }
  };
})();


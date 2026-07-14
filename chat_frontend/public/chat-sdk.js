(function (global) {
  "use strict";
  let state = null;

  const requireState = () => { if (!state) throw new Error("ChatSDK.init must be called first"); return state; };
  const post = (type, data) => {
    const current = requireState();
    current.frame.contentWindow?.postMessage({ type, ...data }, current.chatOrigin);
  };
  const request = async (path, options) => {
    const current = requireState();
    const response = await fetch(`${current.apiUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${current.token}`, "x-chat-app-name": current.appName, ...(options?.headers || {}) },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(payload?.message || "Chat request failed"), { status: response.status, payload });
    return payload;
  };
  const styleFrame = (frame, mode) => {
    const base = { border: "0", background: "#fff", zIndex: "2147483000" };
    const modes = {
      floating: { position: "fixed", right: "24px", bottom: "88px", width: "min(420px, calc(100vw - 32px))", height: "min(700px, calc(100vh - 120px))", borderRadius: "16px", boxShadow: "0 16px 48px rgba(0,0,0,.25)" },
      drawer: { position: "fixed", right: "0", top: "0", width: "min(480px, 100vw)", height: "100vh", boxShadow: "-12px 0 36px rgba(0,0,0,.2)" },
      modal: { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(1100px, calc(100vw - 48px))", height: "min(800px, calc(100vh - 48px))", borderRadius: "12px", boxShadow: "0 20px 60px rgba(0,0,0,.3)" },
      fullpage: { width: "100%", height: "100%" },
      container: { width: "100%", height: "100%" },
    };
    Object.assign(frame.style, base, modes[mode] || modes.container);
  };

  const ChatSDK = {
    init(options) {
      if (!options?.token || !options?.chatUrl || !options?.apiUrl) throw new Error("token, chatUrl, and apiUrl are required");
      this.destroy();
      const container = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
      if (!container) throw new Error("Chat container was not found");
      const frame = document.createElement("iframe");
      const chatUrl = options.chatUrl.replace(/\/$/, "");
      const mode = options.mode || "container";
      frame.src = `${chatUrl}/chat-app?embed=${encodeURIComponent(mode)}`;
      frame.title = options.title || "Chat";
      frame.allow = "camera; microphone; clipboard-write";
      styleFrame(frame, mode);
      container.appendChild(frame);
      state = { ...options, frame, container, mode, appName: options.appName || "chat_system", apiUrl: options.apiUrl.replace(/\/$/, ""), chatOrigin: new URL(chatUrl).origin };
      state.listener = (event) => {
        if (event.origin !== state?.chatOrigin || event.source !== frame.contentWindow) return;
        if (event.data?.type === "chat:ready") post("chat:authenticate", { token: state.token, appName: state.appName });
        if (event.data?.type === "chat:authenticated" && event.data.ok) options.onReady?.();
      };
      global.addEventListener("message", state.listener);
      return this;
    },
    open() { requireState().frame.style.display = "block"; return this; },
    close() { requireState().frame.style.display = "none"; return this; },
    logout() { post("chat:logout", {}); state.token = ""; return this; },
    setTheme(theme) { post("chat:set-theme", { theme }); return this; },
    setLanguage(language) { post("chat:set-language", { language }); return this; },
    sendMessage(chatId, text, options) { return request(`/api/v1/chat/conversations/${encodeURIComponent(chatId)}/messages`, { method: "POST", body: JSON.stringify({ text, ...(options || {}) }) }); },
    joinChannel(channelId) { return request(`/api/v1/chat/channels/${encodeURIComponent(channelId)}/join`, { method: "POST", body: "{}" }); },
    leaveChannel(conversationId) { return request(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/leave`, { method: "POST", body: "{}" }); },
    updateUser({ token }) { if (!token) throw new Error("A newly issued token is required"); state.token = token; post("chat:authenticate", { token, appName: state.appName }); return this; },
    destroy() { if (!state) return; global.removeEventListener("message", state.listener); state.frame.remove(); state = null; },
  };
  global.ChatSDK = ChatSDK;
})(window);

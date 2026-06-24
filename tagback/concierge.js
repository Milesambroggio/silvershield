/* =====================================================================
   THE CONCIERGE — by Silver Shield  ·  TagBack Drone Media edition
   Embeddable 24/7 booking concierge. One line on any page:
     <script src="concierge.js" defer></script>

   - No dependencies. Injects its own styles + markup.
   - Scripted booking flow (no API key) so it works as a live demo now.
   - Architected for a live LLM (CONCIERGE_CONFIG.endpoint) + lead
     delivery (CONCIERGE_CONFIG.onLead) when you go live.

   >>> REMOTE KILL-SWITCH (the "yank the cord" lever) <<<
   The bot only runs while the account is active. Silver Shield controls
   this remotely without touching the client's site:
     - CONCIERGE_CONFIG.enabled        : hard on/off flag (default true)
     - CONCIERGE_CONFIG.licenseUrl     : a JSON URL Silver Shield hosts.
       On load the bot fetches it and expects {"active": true}. Flip it
       to {"active": false} (or take it offline) and every embed of this
       bot goes dormant within one page load — no client cooperation
       needed. See checkLicense() below.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__ssConciergeLoaded) return;
  window.__ssConciergeLoaded = true;

  var DEFAULTS = {
    businessName: "TagBack Drone Media",
    ownerName: "Heath",
    responseWindow: "24 hours",
    // Brand accents (TagBack neon): primary cyan, secondary pink.
    accent: "#21e3ff",
    accent2: "#ff2d9b",
    // ---- Kill-switch ----
    enabled: true,            // set false to disable instantly
    licenseUrl: null,         // e.g. "https://silvershield.llc/licenses/tagback.json" -> {"active":true}
    // ---- Live wiring (optional) ----
    endpoint: null,           // POST {messages,lead} -> {reply}
    onLead: null,             // function(lead) on capture
    greetingDelay: 1500
  };
  var CFG = Object.assign({}, DEFAULTS, window.CONCIERGE_CONFIG || {});

  var lead = { requestType: "", property: "", notes: "", prefDate: "", prefTime: "",
               name: "", email: "", phone: "" };
  var transcript = [], step = "intent", awaiting = null, els = {}, started = false;

  /* ---------------- KILL-SWITCH ---------------- */
  function disabledNotice() {
    // Optional: a tiny, quiet marker so the owner can see it's off. Visitors see nothing.
    console.info("[Concierge] Inactive. Contact Silver Shield to reactivate.");
  }
  function boot() {
    if (CFG.enabled === false) return disabledNotice();
    if (CFG.licenseUrl) {
      // Fail-CLOSED: if the license can't be confirmed active, stay dormant.
      fetch(CFG.licenseUrl, { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.active === true) render(); else disabledNotice(); })
        .catch(disabledNotice);
    } else {
      render();
    }
  }

  /* ---------------- STYLES ---------------- */
  var css = `
  .ssc-root,.ssc-root *{box-sizing:border-box}
  .ssc-root{--cy:${CFG.accent};--pk:${CFG.accent2};--bg:#0b0a14;--bg2:#15131f;--bg3:#100e1a;
    --tx:#e7e7f0;--mut:#9a98ad;--line:rgba(140,140,170,.16);
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    position:fixed;right:24px;bottom:24px;z-index:2147483000}
  @media(max-width:520px){.ssc-root{right:14px;bottom:14px;left:14px}}

  .ssc-launch{position:absolute;right:0;bottom:0;display:flex;align-items:center;gap:10px;
    width:max-content;max-width:290px;cursor:pointer;border:none;background:none;padding:0}
  .ssc-orb{width:62px;height:62px;border-radius:50%;flex:0 0 62px;display:grid;place-items:center;
    background:radial-gradient(circle at 30% 25%,#1c1930,#0c0a16);
    border:1px solid rgba(33,227,255,.55);
    box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 18px rgba(33,227,255,.35),0 0 0 0 rgba(33,227,255,.5);
    transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;animation:ssc-pulse 3.2s infinite}
  .ssc-launch:hover .ssc-orb{transform:scale(1.06)}
  @keyframes ssc-pulse{0%{box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 18px rgba(33,227,255,.35),0 0 0 0 rgba(33,227,255,.45)}
    70%{box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 18px rgba(33,227,255,.35),0 0 0 16px rgba(33,227,255,0)}
    100%{box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 18px rgba(33,227,255,.35),0 0 0 0 rgba(33,227,255,0)}}
  .ssc-orb svg{width:32px;height:32px}
  .ssc-nudge{background:#fff;color:#15151d;font-size:13.5px;font-weight:500;line-height:1.35;
    padding:10px 13px;border-radius:14px 14px 4px 14px;width:200px;flex:0 0 auto;
    box-shadow:0 8px 26px rgba(0,0,0,.3);opacity:0;transform:translateY(8px) scale(.96);
    transition:opacity .4s,transform .4s;pointer-events:none}
  .ssc-nudge.show{opacity:1;transform:none}
  .ssc-nudge b{color:#0b0a14}

  .ssc-panel{position:absolute;right:0;bottom:0;width:382px;max-width:calc(100vw - 28px);
    height:602px;max-height:calc(100vh - 40px);background:linear-gradient(180deg,#0d0b16,#08070f);
    border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;
    box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 40px rgba(33,227,255,.08);
    opacity:0;transform:translateY(18px) scale(.98);pointer-events:none;
    transition:opacity .3s,transform .35s cubic-bezier(.16,1,.3,1)}
  .ssc-panel.open{opacity:1;transform:none;pointer-events:auto}

  .ssc-head{padding:16px 16px 14px;display:flex;align-items:center;gap:11px;
    background:linear-gradient(180deg,rgba(33,227,255,.08),transparent);border-bottom:1px solid var(--line)}
  .ssc-head-orb{width:40px;height:40px;border-radius:50%;flex:0 0 40px;display:grid;place-items:center;
    background:radial-gradient(circle at 30% 25%,#1c1930,#0c0a16);border:1px solid rgba(33,227,255,.5)}
  .ssc-head-orb svg{width:22px;height:22px}
  .ssc-head-meta h4{margin:0;font-family:'Space Grotesk','Inter',sans-serif;font-size:15px;font-weight:600;color:#f4f4fb;letter-spacing:.2px}
  .ssc-head-meta p{margin:2px 0 0;font-size:11.5px;color:var(--mut);display:flex;align-items:center;gap:5px}
  .ssc-dot{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399}
  .ssc-close{margin-left:auto;background:none;border:none;color:var(--mut);cursor:pointer;width:30px;height:30px;
    border-radius:8px;display:grid;place-items:center;transition:.2s}
  .ssc-close:hover{background:rgba(255,255,255,.06);color:#fff}

  .ssc-promise{display:flex;align-items:center;gap:9px;padding:11px 15px;
    background:linear-gradient(180deg,rgba(33,227,255,.12),rgba(255,45,155,.05));border-bottom:1px solid rgba(33,227,255,.2)}
  .ssc-promise svg{width:18px;height:18px;flex:0 0 18px}
  .ssc-promise span{font-size:12px;line-height:1.35;color:#dff6fb}
  .ssc-promise b{color:var(--cy);font-weight:700}
  .ssc-secure{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10.5px;color:var(--mut);
    padding:7px 12px;background:rgba(255,255,255,.02);border-bottom:1px solid var(--line);letter-spacing:.3px}
  .ssc-secure svg{width:12px;height:12px;opacity:.85}
  .ssc-secure b{color:#cfe9ef;font-weight:600}

  .ssc-body{flex:1;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:11px;
    scrollbar-width:thin;scrollbar-color:rgba(140,140,170,.3) transparent}
  .ssc-body::-webkit-scrollbar{width:6px}.ssc-body::-webkit-scrollbar-thumb{background:rgba(140,140,170,.3);border-radius:3px}
  .ssc-msg{max-width:84%;font-size:14px;line-height:1.48;padding:11px 14px;border-radius:16px;animation:ssc-in .35s cubic-bezier(.16,1,.3,1)}
  @keyframes ssc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .ssc-bot{align-self:flex-start;background:var(--bg2);color:#e8eaf2;border:1px solid var(--line);border-bottom-left-radius:5px}
  .ssc-user{align-self:flex-end;background:linear-gradient(135deg,var(--cy),var(--pk));color:#0a0a12;font-weight:500;border-bottom-right-radius:5px}
  .ssc-typing{align-self:flex-start;background:var(--bg2);border:1px solid var(--line);border-bottom-left-radius:5px;padding:13px 15px;display:flex;gap:4px}
  .ssc-typing span{width:6px;height:6px;border-radius:50%;background:var(--mut);animation:ssc-bob 1.2s infinite}
  .ssc-typing span:nth-child(2){animation-delay:.18s}.ssc-typing span:nth-child(3){animation-delay:.36s}
  @keyframes ssc-bob{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}

  .ssc-chips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 14px}
  .ssc-chip{background:rgba(33,227,255,.08);border:1px solid rgba(33,227,255,.4);color:#aef0ff;font-size:13px;font-weight:500;
    padding:8px 14px;border-radius:20px;cursor:pointer;font-family:inherit;transition:.18s}
  .ssc-chip:hover{background:rgba(33,227,255,.18);border-color:var(--cy);transform:translateY(-1px)}

  .ssc-input{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line);background:#08070f}
  .ssc-input input{flex:1;background:var(--bg3);border:1px solid var(--line);border-radius:12px;padding:11px 13px;color:#f4f4fb;font-size:14px;font-family:inherit;outline:none;transition:.2s}
  .ssc-input input:focus{border-color:rgba(33,227,255,.6);box-shadow:0 0 0 3px rgba(33,227,255,.12)}
  .ssc-input input::placeholder{color:#62607a}
  .ssc-send{flex:0 0 44px;width:44px;height:44px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,var(--cy),var(--pk));display:grid;place-items:center;transition:.2s}
  .ssc-send:hover{filter:brightness(1.08)}.ssc-send svg{width:18px;height:18px}
  .ssc-foot{text-align:center;font-size:10px;color:#4f4d63;padding:0 0 9px;background:#08070f;letter-spacing:.3px}
  .ssc-foot b{color:var(--mut);font-weight:500}
  `;

  /* ---------------- ICONS ---------------- */
  var DRONE = '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="ssd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#21e3ff"/><stop offset="1" stop-color="#ff2d9b"/></linearGradient></defs>' +
    '<circle cx="7" cy="8" r="3.4" stroke="url(#ssd)" stroke-width="1.5"/><circle cx="25" cy="8" r="3.4" stroke="url(#ssd)" stroke-width="1.5"/>' +
    '<path d="M7 11.4V14M25 11.4V14" stroke="url(#ssd)" stroke-width="1.5"/>' +
    '<path d="M11 14h10l-2.2 5.2a3 3 0 0 1-2.76 1.8h0a3 3 0 0 1-2.76-1.8L11 14z" stroke="url(#ssd)" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<circle cx="16" cy="16.6" r="1.5" fill="url(#ssd)"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="#9fe9f5" stroke-width="1.7"/><path d="M8 11V8a4 4 0 018 0v3" stroke="#9fe9f5" stroke-width="1.7"/></svg>';
  var CLOCK = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#21e3ff" stroke-width="1.8"/><path d="M12 7.5V12l3 2" stroke="#21e3ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="#0a0a12"/></svg>';
  var X = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ---------------- CONVERSATION ---------------- */
  var FLOW = {
    intent: {
      bot: ["Hey — I'm the booking concierge for " + CFG.businessName + ". 👋",
            "Even when " + CFG.ownerName + " is mid-flight on a shoot, your request won't get missed. Tell me what you need and a time that works, and I'll make sure " + CFG.ownerName + " gets it and replies within " + CFG.responseWindow + ".",
            "What can I help you with?"],
      chips: ["Book a shoot", "Get a quote", "FPV flythrough tour", "Ask a question"],
      route: function (txt) {
        var t = txt.toLowerCase();
        if (t.indexOf("question") > -1 || t.indexOf("ask") > -1) { lead.requestType = "Question"; return "msg_only"; }
        if (t.indexOf("quote") > -1 || t.indexOf("price") > -1 || t.indexOf("cost") > -1) { lead.requestType = "Quote request"; return "prop"; }
        if (t.indexOf("fpv") > -1 || t.indexOf("flythrough") > -1 || t.indexOf("tour") > -1) { lead.requestType = "FPV flythrough tour"; return "prop"; }
        lead.requestType = "Shoot booking"; return "prop";
      }
    },
    prop: { bot: ["Great — a {requestType}. What's the property address or area we'd be shooting?"], capture: "property", next: "need" },
    need: { bot: ["Got it. Anything specific you want captured? (e.g. exterior + interior, twilight, listing video for MLS.) A sentence is plenty — or type \"skip\"."], capture: "notes", next: "pref_date" },
    pref_date: { bot: ["When were you hoping to shoot?"], chips: ["This week", "Next week", "Just exploring", "I'm flexible"], capture: "prefDate", next: "pref_time" },
    pref_time: { bot: ["What time of day works for the light and your schedule?"], chips: ["Morning", "Midday", "Golden hour", "Any time"], capture: "prefTime", next: "ask_name" },
    msg_only: { bot: ["Of course — what would you like me to pass along to " + CFG.ownerName + "?"], capture: "notes", next: "ask_name" },
    ask_name: { bot: ["Perfect. Who should " + CFG.ownerName + " get back to — your name?"], capture: "name", next: "ask_email" },
    ask_email: { bot: ["Thanks, {name}! What's the best email for your confirmation?"], capture: "email", validate: "email", next: "ask_phone" },
    ask_phone: { bot: ["And a cell in case " + CFG.ownerName + " can reach you faster? (Optional — type \"skip\".)"], capture: "phone", validate: "phone", next: "done" },
    done: { build: function () {
      var l = ["You're all set, " + (lead.name || "there") + " ✅"];
      var sum = [];
      if (lead.requestType) sum.push(lead.requestType);
      if (lead.property) sum.push("@ " + lead.property);
      if (lead.notes && lead.requestType !== "Question") sum.push("— " + lead.notes);
      if (lead.prefDate) sum.push("• " + lead.prefDate + (lead.prefTime ? (" " + lead.prefTime.toLowerCase()) : ""));
      l.push("Here's what I've logged: <b>" + (sum.join(" ") || lead.notes || "your request") + "</b>.");
      l.push(CFG.ownerName + " has been notified and will confirm within <b>" + CFG.responseWindow + "</b>. Your details are encrypted and go only to " + CFG.ownerName + " — never sold or shared. 🔒");
      return l;
    }, end: true, fire: true }
  };

  /* ---------------- ENGINE ---------------- */
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function render() {
    if (els.panel) return;
    var root = el("div", "ssc-root");
    var style = el("style"); style.textContent = css; document.head.appendChild(style);
    var launch = el("button", "ssc-launch");
    launch.setAttribute("aria-label", "Open booking concierge");
    launch.innerHTML = '<div class="ssc-nudge" id="sscNudge"></div><div class="ssc-orb">' + DRONE + '</div>';
    launch.onclick = open;
    var panel = el("div", "ssc-panel");
    panel.innerHTML =
      '<div class="ssc-head"><div class="ssc-head-orb">' + DRONE + '</div>' +
        '<div class="ssc-head-meta"><h4>' + CFG.businessName + '</h4><p><span class="ssc-dot"></span> Online • reply guaranteed in ' + CFG.responseWindow + '</p></div>' +
        '<button class="ssc-close" aria-label="Close">' + X + '</button></div>' +
      '<div class="ssc-promise">' + CLOCK + '<span>Even when ' + CFG.ownerName + ' is flying, your request is <b>logged and answered within ' + CFG.responseWindow + '</b> — guaranteed.</span></div>' +
      '<div class="ssc-secure">' + LOCK + ' Private &amp; encrypted • seen only by <b>' + CFG.ownerName + '</b></div>' +
      '<div class="ssc-body" id="sscBody"></div><div class="ssc-chips" id="sscChips"></div>' +
      '<form class="ssc-input" id="sscForm" autocomplete="off"><input id="sscInput" placeholder="Type your message…" aria-label="Message"><button class="ssc-send" type="submit" aria-label="Send">' + SEND + '</button></form>' +
      '<div class="ssc-foot">Powered by <b>Silver Shield</b> • The Concierge</div>';
    root.appendChild(panel); root.appendChild(launch); document.body.appendChild(root);
    els = { root: root, launch: launch, panel: panel, body: panel.querySelector("#sscBody"), chips: panel.querySelector("#sscChips"),
            form: panel.querySelector("#sscForm"), input: panel.querySelector("#sscInput"), nudge: launch.querySelector("#sscNudge") };
    panel.querySelector(".ssc-close").onclick = close;
    els.form.onsubmit = function (e) { e.preventDefault(); var v = els.input.value.trim(); if (v) handle(v); };
    setTimeout(function () {
      els.nudge.innerHTML = "👋 Need a shoot booked or a quote? I'll get you a reply within <b>" + CFG.responseWindow + "</b>.";
      els.nudge.classList.add("show");
      setTimeout(function () { els.nudge.classList.remove("show"); }, 7000);
    }, CFG.greetingDelay);
  }
  function open() { els.panel.classList.add("open"); els.nudge.classList.remove("show"); if (!started) { started = true; runStep("intent"); } setTimeout(function () { els.input.focus(); }, 350); }
  function close() { els.panel.classList.remove("open"); }
  function addMsg(t, r) { var m = el("div", "ssc-msg " + (r === "user" ? "ssc-user" : "ssc-bot"), t); els.body.appendChild(m); transcript.push({ role: r, text: t }); els.body.scrollTop = els.body.scrollHeight; }
  function typing(on) { var t = els.body.querySelector(".ssc-typing"); if (on && !t) { els.body.appendChild(el("div", "ssc-typing", "<span></span><span></span><span></span>")); els.body.scrollTop = els.body.scrollHeight; } else if (!on && t) t.remove(); }
  function setChips(list) { els.chips.innerHTML = ""; (list || []).forEach(function (label) { var c = el("button", "ssc-chip", label); c.onclick = function () { handle(label); }; els.chips.appendChild(c); }); }
  function fill(s) { return s.replace(/\{name\}/g, lead.name || "there").replace(/\{requestType\}/g, (lead.requestType || "request").toLowerCase()); }
  function runStep(id) {
    step = id; awaiting = null; setChips([]);
    var s = FLOW[id], lines = s.build ? s.build() : (s.bot || []), i = 0;
    (function next() {
      if (i >= lines.length) { if (s.capture) { awaiting = s.capture; els.input.placeholder = ph(s); } if (s.chips) setChips(s.chips); if (s.end && s.fire) fireLead(); return; }
      typing(true);
      setTimeout(function () { typing(false); addMsg(fill(lines[i]), "bot"); i++; setTimeout(next, 260); }, Math.min(900, 360 + lines[i].length * 11));
    })();
  }
  function ph(s) { if (s.validate === "email") return "you@email.com"; if (s.validate === "phone") return "(720) 555-1234 or 'skip'"; if (s.capture === "name") return "Your name…"; if (s.capture === "property") return "e.g. 1234 Maple St, Denver"; return "Type your message…"; }
  function handle(text) {
    addMsg(text, "user"); els.input.value = "";
    var s = FLOW[step];
    if (awaiting) {
      var clean = text.trim();
      if (s.validate === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { botSay("Hmm, that doesn't look like a valid email — mind trying again?"); return; }
      if (s.validate === "phone") { if (/^skip$/i.test(clean)) clean = ""; else if (clean.replace(/\D/g, "").length < 7) { botSay("That number looks short — try again, or type \"skip\"."); return; } }
      if ((s.capture === "notes" || s.capture === "property") && /^skip$/i.test(clean)) clean = "";
      lead[awaiting] = clean;
      if (CFG.endpoint) return relay(text);
      runStep(s.next); return;
    }
    if (CFG.endpoint && !s.route && !s.chips) return relay(text);
    var n = s.route ? s.route(text) : s.next; runStep(n || "intent");
  }
  function botSay(t) { typing(true); setTimeout(function () { typing(false); addMsg(t, "bot"); }, 550); }
  function relay(userText) {
    typing(true);
    fetch(CFG.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: transcript, lead: lead }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { typing(false); addMsg(d.reply || "…", "bot"); })
      .catch(function () { typing(false); addMsg("Sorry, I hit a snag — but I've saved your info and " + CFG.ownerName + " will follow up.", "bot"); });
  }
  function fireLead() {
    var payload = Object.assign({ capturedAt: new Date().toISOString(), source: location.href, transcript: transcript }, lead);
    try { if (typeof CFG.onLead === "function") CFG.onLead(payload); } catch (e) {}
    if (!CFG.onLead) console.log("[Concierge] Lead captured (demo):", payload);
    window.dispatchEvent(new CustomEvent("ssc:lead", { detail: payload }));
  }

  window.SilverShieldConcierge = { open: open, close: close, getLead: function () { return lead; }, config: CFG };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

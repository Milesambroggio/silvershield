/* =====================================================================
   SILVER SHIELD — THE CONCIERGE
   Self-contained, embeddable AI concierge widget for real estate sites.
   Drop one line on any page:  <script src="concierge.js" defer></script>

   - No dependencies. Injects its own styles + markup.
   - Runs a scripted real-estate qualification flow out of the box
     (no API key required) so it works as a live demo immediately.
   - Architected to plug into a real LLM + lead backend when you go live:
     set CONCIERGE_CONFIG.endpoint and/or CONCIERGE_CONFIG.onLead.

   PRIVACY BY DESIGN: lead data lives in memory and is delivered only to
   the configured agent (your onLead handler / endpoint). Nothing is sold,
   shared, or used to train public models.
   ===================================================================== */
(function () {
  "use strict";

  // Guard: never initialize twice (e.g. if the script tag is included more than once).
  if (window.__silverShieldConciergeLoaded) return;
  window.__silverShieldConciergeLoaded = true;

  /* ----------------------------------------------------------------
     CONFIG — per-client. Override before this script loads via:
       window.CONCIERGE_CONFIG = { agentName: "...", areas: "...", ... }
     ---------------------------------------------------------------- */
  var DEFAULTS = {
    businessName: "Silver Shield",  // e.g. "Apex Plumbing" / "Reyes Realty"
    ownerName: "the owner",         // who responds — e.g. "Mike" / "Jordan"
    responseWindow: "24 hours",     // the guarantee
    accent: "#e8b84c",              // gold (brand accent — stars, CTAs)
    // Live wiring (leave null to run the built-in scripted demo):
    endpoint: null,                 // POST {messages,lead} -> {reply}
    onLead: null,                   // function(lead) called when a request is captured
    greetingDelay: 1400             // ms before the launcher nudge appears
  };
  var CFG = Object.assign({}, DEFAULTS, window.CONCIERGE_CONFIG || {});
  // Back-compat with older config keys (brokerage/agentName).
  if (window.CONCIERGE_CONFIG) {
    if (window.CONCIERGE_CONFIG.brokerage) CFG.businessName = window.CONCIERGE_CONFIG.brokerage;
    if (window.CONCIERGE_CONFIG.agentName) CFG.ownerName = window.CONCIERGE_CONFIG.agentName;
  }

  // The request record we build through the conversation.
  var lead = { requestType: "", notes: "", prefDate: "", prefTime: "",
               name: "", email: "", phone: "" };
  var transcript = [];   // {role, text}
  var step = "intent";
  var awaiting = null;   // field name when expecting free-text input

  /* ----------------------------------------------------------------
     STYLES
     ---------------------------------------------------------------- */
  var css = `
  .ssc-root,.ssc-root *{box-sizing:border-box}
  .ssc-root{--gold:${CFG.accent};--gold-light:#f0d078;--bg:#0f1019;--bg2:#1a1a2e;
    --bg3:#141420;--silver:#cbd5e1;--silver-3:#94a3b8;--line:rgba(148,163,184,.14);
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    position:fixed;right:24px;bottom:24px;z-index:2147483000}
  @media(max-width:520px){.ssc-root{right:14px;bottom:14px;left:14px}}

  /* Launcher */
  .ssc-launch{position:absolute;right:0;bottom:0;display:flex;align-items:center;gap:10px;
    cursor:pointer;border:none;background:none;padding:0}
  .ssc-orb{width:62px;height:62px;border-radius:50%;flex:0 0 62px;display:grid;place-items:center;
    background:radial-gradient(circle at 30% 25%,#2a2a40,#13131f);
    border:1px solid rgba(203,213,225,.55);
    box-shadow:0 10px 34px rgba(0,0,0,.5),0 0 0 0 rgba(203,213,225,.5);
    transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .3s;
    animation:ssc-pulse 3.2s infinite}
  .ssc-launch:hover .ssc-orb{transform:scale(1.06)}
  @keyframes ssc-pulse{0%{box-shadow:0 10px 34px rgba(0,0,0,.5),0 0 0 0 rgba(203,213,225,.45)}
    70%{box-shadow:0 10px 34px rgba(0,0,0,.5),0 0 0 16px rgba(203,213,225,0)}
    100%{box-shadow:0 10px 34px rgba(0,0,0,.5),0 0 0 0 rgba(203,213,225,0)}}
  .ssc-orb svg{width:30px;height:36px}
  .ssc-nudge{background:#fff;color:#15151d;font-size:13.5px;font-weight:500;line-height:1.35;
    padding:10px 13px;border-radius:14px 14px 4px 14px;max-width:210px;
    box-shadow:0 8px 26px rgba(0,0,0,.28);opacity:0;transform:translateY(8px) scale(.96);
    transition:opacity .4s,transform .4s;pointer-events:none}
  .ssc-nudge.show{opacity:1;transform:none}
  .ssc-nudge b{color:#0f1019}

  /* Panel */
  .ssc-panel{position:absolute;right:0;bottom:0;width:380px;max-width:calc(100vw - 28px);
    height:600px;max-height:calc(100vh - 40px);background:linear-gradient(180deg,#0f1019,#0b0b16);
    border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;
    box-shadow:0 30px 80px rgba(0,0,0,.6);opacity:0;transform:translateY(18px) scale(.98);
    pointer-events:none;transition:opacity .3s,transform .35s cubic-bezier(.16,1,.3,1)}
  .ssc-panel.open{opacity:1;transform:none;pointer-events:auto}

  .ssc-head{padding:16px 16px 14px;display:flex;align-items:center;gap:11px;position:relative;
    background:linear-gradient(180deg,rgba(232,184,76,.08),transparent);
    border-bottom:1px solid var(--line)}
  .ssc-head-orb{width:40px;height:40px;border-radius:50%;flex:0 0 40px;display:grid;place-items:center;
    background:radial-gradient(circle at 30% 25%,#2a2a40,#13131f);border:1px solid rgba(203,213,225,.5)}
  .ssc-head-orb svg{width:20px;height:24px}
  .ssc-head-meta h4{margin:0;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;
    color:#f0f0f6;letter-spacing:.2px}
  .ssc-head-meta p{margin:2px 0 0;font-size:11.5px;color:var(--silver-3);display:flex;align-items:center;gap:5px}
  .ssc-dot{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399}
  .ssc-close{margin-left:auto;background:none;border:none;color:var(--silver-3);cursor:pointer;
    width:30px;height:30px;border-radius:8px;display:grid;place-items:center;transition:.2s}
  .ssc-close:hover{background:rgba(255,255,255,.06);color:#fff}

  .ssc-promise{display:flex;align-items:center;gap:9px;padding:11px 15px;
    background:linear-gradient(180deg,rgba(232,184,76,.13),rgba(232,184,76,.04));
    border-bottom:1px solid rgba(232,184,76,.22)}
  .ssc-promise svg{width:18px;height:18px;flex:0 0 18px}
  .ssc-promise span{font-size:12px;line-height:1.35;color:#f3ead2}
  .ssc-promise b{color:var(--gold);font-weight:700}
  .ssc-secure{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10.5px;
    color:var(--silver-3);padding:7px 12px;background:rgba(255,255,255,.02);
    border-bottom:1px solid var(--line);letter-spacing:.3px}
  .ssc-secure svg{width:12px;height:12px;opacity:.85}
  .ssc-secure b{color:var(--silver);font-weight:600}

  .ssc-body{flex:1;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:11px;
    scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.25) transparent}
  .ssc-body::-webkit-scrollbar{width:6px}
  .ssc-body::-webkit-scrollbar-thumb{background:rgba(148,163,184,.25);border-radius:3px}

  .ssc-msg{max-width:84%;font-size:14px;line-height:1.48;padding:11px 14px;border-radius:16px;
    animation:ssc-in .35s cubic-bezier(.16,1,.3,1)}
  @keyframes ssc-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .ssc-bot{align-self:flex-start;background:var(--bg2);color:#e8eaf2;border:1px solid var(--line);
    border-bottom-left-radius:5px}
  .ssc-user{align-self:flex-end;background:linear-gradient(135deg,#e8b84c,#d4a029);color:#15151d;
    font-weight:500;border-bottom-right-radius:5px}

  .ssc-typing{align-self:flex-start;background:var(--bg2);border:1px solid var(--line);
    border-bottom-left-radius:5px;padding:13px 15px;display:flex;gap:4px}
  .ssc-typing span{width:6px;height:6px;border-radius:50%;background:var(--silver-3);
    animation:ssc-bob 1.2s infinite}
  .ssc-typing span:nth-child(2){animation-delay:.18s}.ssc-typing span:nth-child(3){animation-delay:.36s}
  @keyframes ssc-bob{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}

  .ssc-chips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 16px 14px}
  .ssc-chip{background:rgba(232,184,76,.07);border:1px solid rgba(232,184,76,.35);color:var(--gold-light);
    font-size:13px;font-weight:500;padding:8px 14px;border-radius:20px;cursor:pointer;
    font-family:inherit;transition:.18s}
  .ssc-chip:hover{background:rgba(232,184,76,.16);border-color:var(--gold);transform:translateY(-1px)}

  .ssc-input{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--line);background:#0b0b14}
  .ssc-input input{flex:1;background:var(--bg3);border:1px solid var(--line);border-radius:12px;
    padding:11px 13px;color:#f0f0f6;font-size:14px;font-family:inherit;outline:none;transition:.2s}
  .ssc-input input:focus{border-color:rgba(232,184,76,.6);box-shadow:0 0 0 3px rgba(232,184,76,.1)}
  .ssc-input input::placeholder{color:#5b6478}
  .ssc-send{flex:0 0 44px;width:44px;height:44px;border-radius:12px;border:none;cursor:pointer;
    background:linear-gradient(135deg,#e8b84c,#d4a029);display:grid;place-items:center;transition:.2s}
  .ssc-send:hover{filter:brightness(1.08)}.ssc-send:disabled{opacity:.4;cursor:default}
  .ssc-send svg{width:18px;height:18px}
  .ssc-foot{text-align:center;font-size:10px;color:#4b5468;padding:0 0 9px;background:#0b0b14;letter-spacing:.3px}
  .ssc-foot b{color:var(--silver-3);font-weight:500}
  `;

  /* ----------------------------------------------------------------
     ICONS
     ---------------------------------------------------------------- */
  var SHIELD = '<svg viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<linearGradient id="sscSilver" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#e8e8f0"/><stop offset="0.5" stop-color="#c0c0ce"/><stop offset="1" stop-color="#9090a0"/></linearGradient>' +
    '<linearGradient id="sscGold" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#f0d078"/><stop offset="1" stop-color="#d4a029"/></linearGradient></defs>' +
    // outer silver shield (matches site nav/hero shields)
    '<path d="M16 2L2 8v12c0 9 14 16 14 16s14-7 14-16V8L16 2z" fill="none" stroke="url(#sscSilver)" stroke-width="1.7" stroke-linejoin="round"/>' +
    // faint inner silver line for depth
    '<path d="M16 6L6 10v8c0 7 10 12 10 12s10-5 10-12v-8L16 6z" fill="none" stroke="#b8b8c4" stroke-width="0.7" stroke-linejoin="round" opacity="0.5"/>' +
    // gold star — the brand honor mark
    '<polygon points="16,10 17.4,13.9 21.6,14 18.2,16.7 19.4,20.8 16,18.3 12.6,20.8 13.8,16.7 10.4,14 14.6,13.9" fill="url(#sscGold)"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="5" y="11" width="14" height="9" rx="2" stroke="#cbd5e1" stroke-width="1.7"/>' +
    '<path d="M8 11V8a4 4 0 018 0v3" stroke="#cbd5e1" stroke-width="1.7"/></svg>';
  var CLOCK = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="12" cy="12" r="9" stroke="#e8b84c" stroke-width="1.8"/>' +
    '<path d="M12 7.5V12l3 2" stroke="#e8b84c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SEND = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="#15151d"/></svg>';
  var X = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* ----------------------------------------------------------------
     CONVERSATION SCRIPT
     Each step: bot line(s) + quick replies, or a free-text capture.
     ---------------------------------------------------------------- */
  var FLOW = {
    intent: {
      bot: ["Hi — I'm the concierge for " + CFG.businessName + ". 👋",
            "Even when " + CFG.ownerName + " is away or out on a job, your request won't get missed. Tell me what you need and a time that works, and I'll make sure " + CFG.ownerName + " gets it and replies within " + CFG.responseWindow + ".",
            "What can I help you with?"],
      chips: ["Book an appointment", "Request a quote", "Schedule a visit", "Leave a message"],
      route: function (txt) {
        var t = txt.toLowerCase();
        if (t.indexOf("message") > -1) { lead.requestType = "Message"; return "msg_only"; }
        if (t.indexOf("quote") > -1 || t.indexOf("estimate") > -1) { lead.requestType = "Quote request"; return "need"; }
        if (t.indexOf("visit") > -1 || t.indexOf("showing") > -1 || t.indexOf("tour") > -1) { lead.requestType = "Visit"; return "need"; }
        lead.requestType = "Appointment"; return "need";
      }
    },

    /* ---- REQUEST DETAIL + PREFERRED TIME ---- */
    need: { bot: ["Got it — a {requestType}. Briefly, what do you need? A sentence is plenty."],
      capture: "notes", next: "pref_date" },
    pref_date: { bot: ["What day works best for you?"],
      chips: ["Today", "Tomorrow", "This week", "Next week"], capture: "prefDate", next: "pref_time" },
    pref_time: { bot: ["And what time of day suits you?"],
      chips: ["Morning", "Afternoon", "Evening", "Any time"], capture: "prefTime", next: "ask_name" },

    /* ---- MESSAGE ONLY ---- */
    msg_only: { bot: ["Of course — what message would you like me to pass to " + CFG.ownerName + "?"],
      capture: "notes", next: "ask_name" },

    /* ---- CONTACT DETAILS ---- */
    ask_name: { bot: ["Perfect. Who should " + CFG.ownerName + " get back to — your name?"], capture: "name", next: "ask_email" },
    ask_email: { bot: ["Thanks, {name}! What's the best email for your confirmation?"], capture: "email", validate: "email", next: "ask_phone" },
    ask_phone: { bot: ["And a phone number, in case " + CFG.ownerName + " can reach you faster there? (Optional — type \"skip\".)"],
      capture: "phone", validate: "phone", next: "done" },

    done: { build: function () {
      var l = [];
      l.push("You're all set, " + (lead.name || "there") + " ✅");
      var sum = [];
      if (lead.requestType) sum.push(lead.requestType);
      if (lead.notes && lead.requestType !== "Message") sum.push("— " + lead.notes);
      if (lead.prefDate) sum.push("• " + lead.prefDate + (lead.prefTime ? (" " + lead.prefTime.toLowerCase()) : ""));
      l.push("Here's what I've logged: <b>" + (sum.join(" ") || lead.notes || "your request") + "</b>.");
      l.push(CFG.ownerName + " has been notified and will confirm within <b>" + CFG.responseWindow + "</b>. Your details are encrypted and visible only to " + CFG.ownerName + " — never sold or shared. 🔒");
      return l;
    }, end: true, fire: true }
  };

  /* ----------------------------------------------------------------
     ENGINE
     ---------------------------------------------------------------- */
  var els = {};
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function render() {
    if (els.panel) return; // never build the widget twice
    var root = el("div", "ssc-root");
    var style = el("style"); style.textContent = css; document.head.appendChild(style);

    // Launcher
    var launch = el("button", "ssc-launch");
    launch.setAttribute("aria-label", "Open concierge chat");
    launch.innerHTML = '<div class="ssc-nudge" id="sscNudge"></div><div class="ssc-orb">' + SHIELD + '</div>';
    launch.onclick = open;

    // Panel
    var panel = el("div", "ssc-panel");
    panel.innerHTML =
      '<div class="ssc-head"><div class="ssc-head-orb">' + SHIELD + '</div>' +
        '<div class="ssc-head-meta"><h4>' + CFG.businessName + ' Concierge</h4>' +
        '<p><span class="ssc-dot"></span> Online • guaranteed reply in ' + CFG.responseWindow + '</p></div>' +
        '<button class="ssc-close" aria-label="Close">' + X + '</button></div>' +
      '<div class="ssc-promise">' + CLOCK + '<span>Even when ' + CFG.ownerName + ' is out, your request is <b>logged and answered within ' + CFG.responseWindow + '</b> — guaranteed.</span></div>' +
      '<div class="ssc-secure">' + LOCK + ' Private &amp; encrypted • seen only by <b>' + CFG.ownerName + '</b></div>' +
      '<div class="ssc-body" id="sscBody"></div>' +
      '<div class="ssc-chips" id="sscChips"></div>' +
      '<form class="ssc-input" id="sscForm" autocomplete="off">' +
        '<input id="sscInput" placeholder="Type your message…" aria-label="Message">' +
        '<button class="ssc-send" type="submit" aria-label="Send">' + SEND + '</button></form>' +
      '<div class="ssc-foot">Powered by <b>Silver Shield</b> • The Concierge</div>';

    root.appendChild(panel); root.appendChild(launch);
    document.body.appendChild(root);

    els.root = root; els.launch = launch; els.panel = panel;
    els.body = panel.querySelector("#sscBody");
    els.chips = panel.querySelector("#sscChips");
    els.form = panel.querySelector("#sscForm");
    els.input = panel.querySelector("#sscInput");
    els.nudge = launch.querySelector("#sscNudge");

    panel.querySelector(".ssc-close").onclick = close;
    els.form.onsubmit = function (e) { e.preventDefault(); var v = els.input.value.trim(); if (v) handle(v); };

    // Nudge bubble
    setTimeout(function () {
      els.nudge.innerHTML = "👋 Need to book or get a quote? I'll make sure you get a reply within <b>" + CFG.responseWindow + "</b>.";
      els.nudge.classList.add("show");
      setTimeout(function () { els.nudge.classList.remove("show"); }, 7000);
    }, CFG.greetingDelay);
  }

  var started = false;
  function open() {
    els.panel.classList.add("open");
    els.nudge.classList.remove("show");
    if (!started) { started = true; runStep("intent"); }
    setTimeout(function () { els.input.focus(); }, 350);
  }
  function close() { els.panel.classList.remove("open"); }

  function addMsg(text, role) {
    var m = el("div", "ssc-msg " + (role === "user" ? "ssc-user" : "ssc-bot"), text);
    els.body.appendChild(m); transcript.push({ role: role, text: text });
    els.body.scrollTop = els.body.scrollHeight;
  }
  function typing(on) {
    var t = els.body.querySelector(".ssc-typing");
    if (on && !t) { var d = el("div", "ssc-typing", "<span></span><span></span><span></span>"); els.body.appendChild(d); els.body.scrollTop = els.body.scrollHeight; }
    else if (!on && t) t.remove();
  }
  function setChips(list) {
    els.chips.innerHTML = "";
    (list || []).forEach(function (label) {
      var c = el("button", "ssc-chip", label);
      c.onclick = function () { handle(label); };
      els.chips.appendChild(c);
    });
  }
  function fill(str) {
    return str.replace(/\{name\}/g, lead.name || "there")
              .replace(/\{requestType\}/g, (lead.requestType || "request").toLowerCase());
  }

  // Output a step's bot lines (sequentially with typing), then chips.
  function runStep(id) {
    step = id; awaiting = null; setChips([]);
    var s = FLOW[id];
    var lines = s.build ? s.build() : (s.bot || []);
    var i = 0;
    (function next() {
      if (i >= lines.length) {
        if (s.capture) { awaiting = s.capture; els.input.placeholder = placeholderFor(s); }
        if (s.chips) setChips(s.chips);
        if (s.end) endConversation(s);
        return;
      }
      typing(true);
      setTimeout(function () {
        typing(false); addMsg(fill(lines[i]), "bot"); i++;
        setTimeout(next, 260);
      }, Math.min(900, 360 + lines[i].length * 12));
    })();
  }
  function placeholderFor(s) {
    if (s.validate === "email") return "you@email.com";
    if (s.validate === "phone") return "(555) 123-4567 or 'skip'";
    if (s.capture === "name") return "Your name…";
    if (s.capture === "notes") return "Type your request…";
    return "Type your message…";
  }

  function endConversation(s) {
    setChips([]);
    els.input.placeholder = "Conversation complete — say hi anytime";
    if (s.fire) fireLead();
  }

  // Handle any user input (typed or chip).
  function handle(text) {
    addMsg(text, "user"); els.input.value = "";
    var s = FLOW[step];

    // Free-text capture step
    if (awaiting) {
      var clean = text.trim();
      if (s.validate === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        botSay("Hmm, that doesn't look like a valid email — mind trying again?"); return;
      }
      if (s.validate === "phone") {
        if (/^skip$/i.test(clean)) clean = "";
        else if (clean.replace(/\D/g, "").length < 7) { botSay("That number looks short — try again, or type \"skip\"."); return; }
      }
      lead[awaiting] = clean;
      if (CFG.endpoint) return relayToLLM(text);
      runStep(s.next); return;
    }

    // Routing / chip step
    if (CFG.endpoint && !s.route && !s.chips) return relayToLLM(text);
    var nextId = s.route ? s.route(text) : s.next;
    if (nextId) runStep(nextId);
    else runStep("intent");
  }

  function botSay(t) { typing(true); setTimeout(function () { typing(false); addMsg(t, "bot"); }, 550); }

  /* ----------------------------------------------------------------
     LIVE LLM HOOK (optional). Only used if CFG.endpoint is set.
     Expects: POST {messages:[{role,text}], lead} -> {reply:"..."}
     ---------------------------------------------------------------- */
  function relayToLLM(userText) {
    typing(true);
    fetch(CFG.endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: transcript, lead: lead })
    }).then(function (r) { return r.json(); })
      .then(function (d) { typing(false); addMsg(d.reply || "…", "bot"); })
      .catch(function () { typing(false); addMsg("Sorry, I hit a snag — but I've saved your info and " + CFG.agentName + " will follow up.", "bot"); });
  }

  /* ----------------------------------------------------------------
     LEAD DELIVERY — private to the agent. Wire CFG.onLead for live use.
     ---------------------------------------------------------------- */
  function fireLead() {
    var payload = Object.assign({ capturedAt: new Date().toISOString(), source: location.href, transcript: transcript }, lead);
    try { if (typeof CFG.onLead === "function") CFG.onLead(payload); } catch (e) {}
    // Demo fallback: log so you can see the captured lead in the console.
    if (!CFG.onLead) console.log("[Silver Shield Concierge] Lead captured (demo):", payload);
    window.dispatchEvent(new CustomEvent("ssc:lead", { detail: payload }));
  }

  /* ---- boot ---- */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();

  // Expose a tiny API for testing/integration.
  window.SilverShieldConcierge = { open: open, close: close, getLead: function () { return lead; }, config: CFG };
})();

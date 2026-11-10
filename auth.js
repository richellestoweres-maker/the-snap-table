/* SNAP Table accounts: sign in, profile and sync. Optional, the app works without it. */
(function(){
  var CONFIG = {
    apiKey: "AIzaSyAV0ATUxVJ-uBdpFjt41rNRqUtxSCRBluA",
    authDomain: "snap-table-860db.firebaseapp.com",
    projectId: "snap-table-860db",
    storageBucket: "snap-table-860db.firebasestorage.app",
    messagingSenderId: "136355658653",
    appId: "1:136355658653:web:cfa41ea2b1bef05f930d74"
  };
  var V = "10.12.2", BASE = "https://www.gstatic.com/firebasejs/" + V + "/";
  var KEYS = "snaptable.v1", PKEY = "snaptable.profile";
  var auth = null, db = null, user = null, profile = {}, pushTimer = null, ready = false, busy = false;
  function G(n){ try { return eval(n); } catch(e) { return undefined; } }
  var ALL = {peanut:"Peanuts", treenut:"Tree nuts", milk:"Milk", egg:"Eggs", wheat:"Wheat", soy:"Soy", fish:"Fish", shellfish:"Shellfish", sesame:"Sesame"};

  try { profile = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; } catch(e) { profile = {}; }

  function load(src){ return new Promise(function(ok, no){ var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function $(id){ return document.getElementById(id); }

  /* Styles */
  var css = document.createElement("style");
  css.textContent = [
    "#acctbtn{margin-left:auto;width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line,#E6DCCF);background:var(--card,#FFFBF5);color:var(--burg,#3D1520);font:700 15px 'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;cursor:pointer}",
    "#acctbtn svg{width:20px;height:20px}",
    "#acct{position:fixed;inset:0;z-index:60;background:rgba(30,10,15,.45);display:flex;align-items:flex-end;justify-content:center}",
    "#acct .sheet{background:var(--cream,#F8F1E7);width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:20px 18px 28px;box-shadow:0 -10px 30px rgba(0,0,0,.2)}",
    "#acct h2{margin:0 0 4px;font-family:Fraunces,serif;color:var(--burg,#3D1520)}",
    "#acct .x{float:right;background:none;border:0;font-size:26px;line-height:1;color:#7a6a63;cursor:pointer}",
    "#acct label{display:block;font-size:13px;font-weight:600;margin:14px 0 6px;color:#4a3a35}",
    "#acct input,#acct select{width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1.5px solid var(--line,#E6DCCF);background:#fff;font:16px 'DM Sans',sans-serif}",
    "#acct .btn1{width:100%;margin-top:14px;padding:13px;border-radius:14px;border:0;background:var(--burg,#3D1520);color:#fff;font:700 15px 'DM Sans',sans-serif;cursor:pointer}",
    "#acct .btn2{width:100%;margin-top:10px;padding:12px;border-radius:14px;border:1.5px solid var(--line,#E6DCCF);background:#fff;color:#2a1a18;font:600 15px 'DM Sans',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}",
    "#acct .link{background:none;border:0;color:var(--burg,#3D1520);text-decoration:underline;font:600 14px 'DM Sans',sans-serif;cursor:pointer;padding:6px 0}",
    "#acct .danger{color:#A12A2A}",
    "#acct .or{text-align:center;color:#8a7a73;font-size:13px;margin:14px 0 0}",
    "#acct .msg{margin-top:12px;padding:10px 12px;border-radius:12px;background:#FFF3E0;color:#6b3d00;font-size:14px}",
    "#acct .ok{background:#EAF5EA;color:#1f5a2a}",
    "#acct .chips{display:flex;flex-wrap:wrap;gap:8px}",
    "#acct .chip{padding:8px 12px;border-radius:999px;border:1.5px solid var(--line,#E6DCCF);background:#fff;font:600 13px 'DM Sans',sans-serif;cursor:pointer}",
    "#acct .chip.on{background:var(--burg,#3D1520);border-color:var(--burg,#3D1520);color:#fff}",
    "#acct .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    "#acct .sub{color:#6b5a53;font-size:14px;margin:4px 0 0}",
    "#acct hr{border:0;border-top:1px solid var(--line,#E6DCCF);margin:20px 0 6px}"
  ].join("\n");
  document.head.appendChild(css);

  /* Header button */
  function headerBtn(){
    var h = document.querySelector("header"); if (!h) return;
    var b = $("acctbtn");
    if (!b) { b = document.createElement("button"); b.id = "acctbtn"; b.setAttribute("aria-label", "Account"); b.onclick = open; h.style.display = "flex"; h.style.alignItems = "center"; h.appendChild(b); }
    var name = (profile.name || "").trim();
    b.innerHTML = user ? esc((name || user.email || "?").charAt(0).toUpperCase()) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
  }

  /* Sheet */
  var view = "signin", note = "", noteOk = false, confirmDelete = false;
  function open(){ view = user ? "profile" : "signin"; note = ""; confirmDelete = false; draw(); }
  function close(){ var a = $("acct"); if (a) a.remove(); }
  function say(m, ok){ note = m; noteOk = !!ok; draw(); }

  function draw(){
    var a = $("acct");
    if (!a) { a = document.createElement("div"); a.id = "acct"; a.onclick = function(e){ if (e.target === a) close(); }; document.body.appendChild(a); }
    var h = '<div class="sheet"><button class="x" aria-label="Close" data-a="close">×</button>';
    if (!ready) h += '<h2>Account</h2><p class="sub">Loading…</p>';
    else if (view === "signin" || view === "create" || view === "reset") h += signinHTML();
    else h += profileHTML();
    if (note) h += '<div class="msg ' + (noteOk ? "ok" : "") + '">' + esc(note) + '</div>';
    h += '</div>';
    a.innerHTML = h;
    a.querySelectorAll("[data-a]").forEach(function(el){ el.onclick = act; });
    a.querySelectorAll("[data-al]").forEach(function(el){ el.onclick = function(){ el.classList.toggle("on"); }; });
    a.querySelectorAll("[data-di]").forEach(function(el){ el.onclick = function(){ el.classList.toggle("on"); }; });
  }

  function signinHTML(){
    if (view === "reset") return '<h2>Reset password</h2><p class="sub">We\'ll email you a link.</p>' +
      '<label for="ae">Email</label><input id="ae" type="email" autocomplete="email" value="' + esc(($("ae") || {}).value || "") + '">' +
      '<button class="btn1" data-a="reset">Send link</button><button class="link" data-a="tosignin">Back to sign in</button>';
    var create = view === "create";
    return '<h2>' + (create ? "Create your account" : "Sign in") + '</h2>' +
      '<p class="sub">Save your pantry, plan and list on every device.</p>' +
      '<button class="btn2" data-a="google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 38.6 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</button>' +
      '<p class="or">or use email</p>' +
      '<label for="ae">Email</label><input id="ae" type="email" autocomplete="email">' +
      '<label for="ap">Password</label><input id="ap" type="password" autocomplete="' + (create ? "new-password" : "current-password") + '" placeholder="' + (create ? "At least 6 characters" : "") + '">' +
      '<button class="btn1" data-a="' + (create ? "create" : "email") + '">' + (create ? "Create account" : "Sign in") + '</button>' +
      (create ? '<button class="link" data-a="tosignin">I already have an account</button>'
              : '<button class="link" data-a="tocreate">New here? Create an account</button><br><button class="link" data-a="toreset">Forgot password?</button>') +
      '<button class="btn2" data-a="close">Not now</button>';
  }

  function profileHTML(){
    var S = G("S") || {};
    var stores = (G("STORES") || []).map(function(s){ return '<option value="' + s.id + '"' + (S.store === s.id ? " selected" : "") + '>' + esc(s.name) + '</option>'; }).join("");
    var al = Object.keys(ALL).map(function(k){ return '<button class="chip ' + ((S.allergies || []).indexOf(k) > -1 ? "on" : "") + '" data-al="' + k + '">' + ALL[k] + '</button>'; }).join("");
    var di = (G("DIETS") || []).map(function(d){ return '<button class="chip ' + ((S.diets || []).indexOf(d[0]) > -1 ? "on" : "") + '" data-di="' + d[0] + '">' + esc(d[1]) + '</button>'; }).join("");
    var h = '<h2>Your profile</h2><p class="sub">' + esc(user.email || "") + '</p>' +
      '<label for="pn">First name</label><input id="pn" autocomplete="given-name" value="' + esc(profile.name || "") + '">' +
      '<div class="row2"><div><label for="pf">Family size</label><input id="pf" type="number" min="1" max="20" inputmode="numeric" value="' + esc(S.family || 4) + '"></div>' +
      '<div><label for="pz">ZIP code</label><input id="pz" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="' + esc(profile.zip || "") + '"></div></div>' +
      '<label for="ps">Store you shop at most</label><select id="ps">' + stores + '</select>' +
      '<label>Allergies</label><div class="chips">' + al + '</div>' +
      '<label>Diet needs</label><div class="chips">' + di + '</div>' +
      '<button class="btn1" data-a="saveprofile">Save</button>' +
      '<hr><button class="btn2" data-a="signout">Sign out</button>';
    h += confirmDelete
      ? '<p class="sub" style="margin-top:14px">This erases your account and everything saved in it. It can\'t be undone.</p><button class="btn2 danger" data-a="deleteyes">Yes, delete my account</button><button class="link" data-a="deleteno">Keep my account</button>'
      : '<button class="link danger" data-a="delete">Delete my account</button>';
    return h;
  }

  function friendly(e){
    var c = (e && e.code) || "";
    if (c.indexOf("invalid-credential") > -1 || c.indexOf("wrong-password") > -1 || c.indexOf("user-not-found") > -1) return "That email and password don't match. Try again or reset your password.";
    if (c.indexOf("email-already-in-use") > -1) return "That email already has an account. Sign in instead.";
    if (c.indexOf("weak-password") > -1) return "Use a password with at least 6 characters.";
    if (c.indexOf("invalid-email") > -1) return "Check the email address.";
    if (c.indexOf("popup-closed") > -1 || c.indexOf("cancelled-popup") > -1) return "Sign in was closed before it finished.";
    if (c.indexOf("network") > -1) return "No connection. Try again when you're online.";
    if (c.indexOf("too-many-requests") > -1) return "Too many tries. Wait a minute and try again.";
    return "Something went wrong. Please try again.";
  }

  function act(e){
    var a = e.currentTarget.getAttribute("data-a");
    var em = $("ae") ? $("ae").value.trim() : "", pw = $("ap") ? $("ap").value : "";
    if (a === "close") return close();
    if (a === "tocreate") { view = "create"; note = ""; return draw(); }
    if (a === "tosignin") { view = "signin"; note = ""; return draw(); }
    if (a === "toreset") { view = "reset"; note = ""; return draw(); }
    if (a === "delete") { confirmDelete = true; return draw(); }
    if (a === "deleteno") { confirmDelete = false; return draw(); }
    if (busy) return;
    if (a === "google") return google();
    if (a === "email") { if (!em || !pw) return say("Enter your email and password."); busy = true; return auth.signInWithEmailAndPassword(em, pw).then(done).catch(function(err){ busy = false; say(friendly(err)); }); }
    if (a === "create") { if (!em || !pw) return say("Enter an email and a password."); busy = true; return auth.createUserWithEmailAndPassword(em, pw).then(done).catch(function(err){ busy = false; say(friendly(err)); }); }
    if (a === "reset") { if (!em) return say("Enter your email."); busy = true; return auth.sendPasswordResetEmail(em).then(function(){ busy = false; say("Check your email for a reset link.", true); }).catch(function(err){ busy = false; say(friendly(err)); }); }
    if (a === "saveprofile") return saveProfile();
    if (a === "signout") { return auth.signOut().then(function(){ close(); }); }
    if (a === "deleteyes") return removeAccount();
  }

  function done(){ busy = false; view = "profile"; note = ""; }

  function google(){
    var p = new firebase.auth.GoogleAuthProvider();
    busy = true;
    auth.signInWithPopup(p).then(done).catch(function(err){
      busy = false;
      var c = (err && err.code) || "";
      if (c.indexOf("popup-blocked") > -1 || c.indexOf("operation-not-supported") > -1 || c.indexOf("web-storage") > -1) return auth.signInWithRedirect(p);
      say(friendly(err));
    });
  }

  function saveProfile(){
    var S = G("S"); if (!S) return;
    profile.name = ($("pn").value || "").trim().slice(0, 40);
    profile.zip = ($("pz").value || "").replace(/\D/g, "").slice(0, 5);
    var fam = parseInt($("pf").value, 10); if (fam > 0 && fam < 21) S.family = fam;
    S.store = $("ps").value || S.store;
    S.allergies = Array.prototype.map.call(document.querySelectorAll("#acct [data-al].on"), function(el){ return el.getAttribute("data-al"); });
    S.diets = Array.prototype.map.call(document.querySelectorAll("#acct [data-di].on"), function(el){ return el.getAttribute("data-di"); });
    S.asked = true;
    try { localStorage.setItem(PKEY, JSON.stringify(profile)); } catch(e) {}
    if (typeof window.save === "function") window.save();
    if (typeof window.render === "function") window.render();
    headerBtn();
    say("Saved.", true);
  }

  function removeAccount(){
    if (!user) return;
    busy = true;
    var uid = user.uid;
    db.collection("users").doc(uid).delete().catch(function(){}).then(function(){ return user.delete(); }).then(function(){
      busy = false; profile = {};
      try { localStorage.removeItem(PKEY); } catch(e) {}
      close();
    }).catch(function(err){
      busy = false;
      if (((err && err.code) || "").indexOf("requires-recent-login") > -1) { auth.signOut(); view = "signin"; say("For your security, sign in again, then tap Delete my account."); }
      else say(friendly(err));
    });
  }

  /* Sync */
  function localState(){ try { return localStorage.getItem(KEYS) || "{}"; } catch(e) { return "{}"; } }
  function push(){
    if (!user || !db) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function(){
      db.collection("users").doc(user.uid).set({ state: localState(), profile: profile, updated: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function(){});
    }, 1200);
  }
  function hookSave(){
    if (typeof window.save !== "function" || window.save.__synced) return;
    var orig = window.save;
    var wrapped = function(){ var r = orig.apply(this, arguments); push(); return r; };
    wrapped.__synced = true;
    window.save = wrapped;
  }
  function pull(){
    return db.collection("users").doc(user.uid).get().then(function(doc){
      if (doc.exists && doc.data().state) {
        var d = doc.data(), cloud = {}, local = {};
        try { cloud = JSON.parse(d.state) || {}; } catch(e) {}
        try { local = JSON.parse(localState()) || {}; } catch(e) {}
        if (Array.isArray(local.pantry) && Array.isArray(cloud.pantry)) cloud.pantry = Array.from(new Set(cloud.pantry.concat(local.pantry)));
        if (local.list && cloud.list && typeof local.list === "object") cloud.list = Object.assign({}, local.list, cloud.list);
        if (d.profile) profile = Object.assign({}, profile, d.profile);
        try { localStorage.setItem(KEYS, JSON.stringify(cloud)); localStorage.setItem(PKEY, JSON.stringify(profile)); } catch(e) {}
        if (G("S")) {
          Object.assign(G("S"), cloud, { meal: null, scratch: null, q: "", mq: "" });
          if (G("ITEM") && Array.isArray(G("S").pantry)) G("S").pantry = G("S").pantry.filter(function(id){ return G("ITEM")[id]; });
        }
        if (typeof window.render === "function") window.render();
        push();
      } else {
        push();
      }
    }).catch(function(){});
  }

  /* Start */
  function start(){
    headerBtn();
    load(BASE + "firebase-app-compat.js")
      .then(function(){ return load(BASE + "firebase-auth-compat.js"); })
      .then(function(){ return load(BASE + "firebase-firestore-compat.js"); })
      .then(function(){
        firebase.initializeApp(CONFIG);
        auth = firebase.auth(); db = firebase.firestore();
        auth.getRedirectResult().catch(function(){});
        auth.onAuthStateChanged(function(u){
          user = u; ready = true; headerBtn(); hookSave();
          if (u) pull();
          if ($("acct")) { view = u ? "profile" : (view === "profile" ? "signin" : view); draw(); }
        });
      })
      .catch(function(){ ready = true; headerBtn(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.SnapAccount = { open: open };
})();

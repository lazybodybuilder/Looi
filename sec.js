// Shared crypto for the LOOI remote link. Loaded by both index.html (phone) and remote.html (PC),
// so the two ends can never drift apart. See README "Remote security".
"use strict";
const SEC = (() => {
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  const ITER = 600000;
  async function derive(pass, salt, iter = ITER) {
    const base = await crypto.subtle.importKey("raw", te.encode(pass.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, 256));
  }
  async function mac(key, label) {
    const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", k, te.encode(label)));
  }
  function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
  // dir: 0 = phone sends, 1 = PC sends. Messages are { e: ciphertext, n: counter }; the counter is part of the IV.
  async function session(key, transcript, dir) {
    const aes = await crypto.subtle.importKey("raw", await mac(key, "looi-session|" + transcript), "AES-GCM", false, ["encrypt", "decrypt"]);
    const iv = (d, n) => { const v = new Uint8Array(12); v[0] = d; new DataView(v.buffer).setUint32(4, Math.floor(n / 2 ** 32)); new DataView(v.buffer).setUint32(8, n >>> 0); return v; };
    let sendN = 0, recvN = 0, sendQ = Promise.resolve(), recvQ = Promise.resolve();
    return {
      seal(obj) {
        const n = ++sendN;
        return (sendQ = sendQ.catch(() => {}).then(async () => ({ e: b64(new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv(dir, n) }, aes, te.encode(JSON.stringify(obj))))), n })));
      },
      open(m) {
        return (recvQ = recvQ.catch(() => {}).then(async () => {
          if (!m || typeof m.e !== "string" || !Number.isSafeInteger(m.n) || m.n <= recvN) throw new Error("unexpected or replayed message");
          const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv(dir ^ 1, m.n) }, aes, unb64(m.e));
          recvN = m.n;
          return JSON.parse(td.decode(pt));
        }));
      },
    };
  }
  // Media calls (video, audio) carry their own DTLS keys, exchanged through the signal server. Each side reports the
  // certificate fingerprints it sees over the encrypted channel; if a relay swapped in its own keys they won't match.
  const fpOf = (sdp) => (String(sdp || "").match(/^a=fingerprint:.*$/gm) || []).map((l) => l.trim().toLowerCase()).sort().join(",");
  function watchMedia(call, report, onBad) {
    const st = { mine: null, theirs: null, ok: false, done: false };
    let tries = 0;
    const poll = setInterval(() => {
      const pc = call.peerConnection;
      if (++tries > 75 || st.done) return clearInterval(poll);
      if (!pc?.localDescription?.sdp || !pc?.remoteDescription?.sdp) return;
      clearInterval(poll);
      st.mine = { local: fpOf(pc.localDescription.sdp), remote: fpOf(pc.remoteDescription.sdp) };
      report({ t: "media-fp", id: call.connectionId, local: st.mine.local, remote: st.mine.remote });
      st.check();
    }, 200);
    st.check = () => {
      if (st.done || !st.mine || !st.theirs) return;
      st.done = true;
      st.ok = !!st.mine.local && st.mine.local === st.theirs.remote && st.mine.remote === st.theirs.local;
      if (!st.ok) onBad("its encryption keys don't match on both ends");
    };
    st.theirsIn = (m) => { st.theirs = { local: String(m.local), remote: String(m.remote) }; st.check(); };
    const timer = setTimeout(() => { if (!st.done) { st.done = true; onBad("it couldn't be verified in time"); } }, 15000);
    call.on("close", () => { st.done = true; clearInterval(poll); clearTimeout(timer); });
    return st;
  }
  return { b64, unb64, rand, derive, mac, same, session, ITER, fpOf, watchMedia };
})();
window.SEC = SEC;

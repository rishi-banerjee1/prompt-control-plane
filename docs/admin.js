// ── State ────────────────────────────────────────────────────────────────
var rules = JSON.parse(localStorage.getItem('pcp-rules') || '[]');
var auditRows = [];

// ── Optimizer command ────────────────────────────────────────────────────
function updateOptimizerCmd() {
  var mode       = document.getElementById('opt-mode').value;
  var target     = document.getElementById('opt-target').value;
  var strictness = document.getElementById('opt-strictness').value;
  var threshold  = document.getElementById('opt-threshold').value;
  var maxSess    = document.getElementById('opt-maxsess').value;
  var retention  = document.getElementById('opt-retention').value;
  var ephemeral  = document.getElementById('opt-ephemeral').checked;
  var parts = [
    'mode to ' + mode,
    'default output format to ' + target,
    'strictness to ' + strictness,
    'quality threshold to ' + threshold
  ];
  if (maxSess) parts.push('max sessions to ' + maxSess);
  if (retention) parts.push('session retention to ' + retention + ' days');
  if (ephemeral) parts.push('ephemeral mode on');
  document.getElementById('optimizer-cmd').textContent =
    'Please configure the optimizer with ' + parts.join(', ') + '.';
}

// ── Policy command ────────────────────────────────────────────────────────
function updatePolicyCmd() {
  var mode       = document.getElementById('pol-mode').value;
  var strictness = document.getElementById('pol-strictness').value;
  var audit      = document.getElementById('pol-audit').checked;
  var parts = ['policy mode to ' + mode, 'strictness to ' + strictness];
  if (audit) parts.push('audit logging enabled');
  document.getElementById('policy-cmd').textContent =
    'Please configure the optimizer with ' + parts.join(', ') + '.';
}
function genLock() {
  var pw = document.getElementById('pol-pass').value.trim();
  if (!pw) { alert('Log in with your enterprise license first: the passphrase is derived automatically.'); return; }
  document.getElementById('policy-cmd').textContent =
    'Please lock the optimizer configuration with the passphrase: ' + pw;
}
function genUnlock() {
  var pw = document.getElementById('pol-pass').value.trim();
  if (!pw) { alert('Log in with your enterprise license first: the passphrase is derived automatically.'); return; }
  document.getElementById('policy-cmd').textContent =
    'Please unlock the optimizer configuration with the passphrase: ' + pw;
}

// ── Session command ───────────────────────────────────────────────────────
function updateSessionCmd() {
  var age   = document.getElementById('sess-age').value;
  var keep  = document.getElementById('sess-keep').value;
  var dry   = document.getElementById('sess-dry').checked;
  var cmd   = 'Please purge sessions older than ' + age + ' days';
  if (keep > 0) cmd += ', keeping the last ' + keep;
  cmd += dry ? '. Run as a dry run: show me what would be removed without removing anything.'
: '.';
  document.getElementById('session-cmd').textContent = cmd;
}

// ── Audit log ─────────────────────────────────────────────────────────────
async function sha256hex(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function stableJSON(v) {
  if (Array.isArray(v)) return '[' + v.map(stableJSON).join(',') + ']';
  if (v !== null && typeof v === 'object')
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableJSON(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
async function parseAudit() {
  var raw = document.getElementById('audit-input').value.trim();
  if (!raw) return alert('Paste your audit.log content first.');
  var entries = raw.split('\n').filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
  if (!entries.length) return alert('No valid JSON entries found: check the format.');
  var prevHash = '0'.repeat(64);
  auditRows = [];
  for (var e of entries) {
    var { integrity_hash, ...base } = e;
    var expected = await sha256hex(prevHash + stableJSON(base));
    auditRows.push({ ...e, _ok: integrity_hash === expected, _n: auditRows.length + 1 });
    prevHash = integrity_hash || expected;
  }
  var fails = auditRows.filter(r => !r._ok).length;
  var stats = document.getElementById('audit-stats');
  stats.replaceChildren(
    statTile('Total', auditRows.length),
    statTile('Success', auditRows.filter(r => r.outcome==='success').length),
    statTile('Blocked', auditRows.filter(r => r.outcome==='blocked').length, 'var(--red)'),
    statTile('Errors', auditRows.filter(r => r.outcome==='error').length, 'var(--orange)'),
    statTile('Chain Breaks', fails, fails ? 'var(--red)': 'var(--green)')
  );
  renderAuditRows(auditRows);
  document.getElementById('audit-results').style.display = 'block';
}
function statTile(label, n, color) {
  var tile = document.createElement('div');
  tile.className = 'stat-tile';
  var count = document.createElement('span');
  count.className = 'n';
  if (color) count.style.color = color;
  count.textContent = String(n);
  var text = document.createElement('div');
  text.className = 'l';
  text.textContent = label;
  tile.append(count, text);
  return tile;
}
function renderAuditRows(rows) {
  var tbody = document.getElementById('audit-tbody');
  tbody.replaceChildren();
  rows.forEach(function(r) {
    var tr = document.createElement('tr');
    var n = document.createElement('td');
    n.textContent = String(r._n);
    var ts = document.createElement('td');
    ts.style.whiteSpace = 'nowrap';
    ts.style.fontSize = '0.75rem';
    ts.textContent = r.timestamp ? new Date(r.timestamp).toLocaleString(): ':';
    var eventCell = document.createElement('td');
    var eventCode = document.createElement('code');
    eventCode.style.fontSize = '0.75rem';
    eventCode.textContent = r.event || ':';
    eventCell.appendChild(eventCode);
    var outcome = document.createElement('td');
    outcome.className = r.outcome === 'success' ? 'outcome-success': r.outcome === 'blocked' ? 'outcome-blocked': 'outcome-error';
    outcome.textContent = r.outcome || ':';
    var details = document.createElement('td');
    details.style.fontSize = '0.75rem';
    details.style.maxWidth = '200px';
    if (r.details) {
      Object.entries(r.details).slice(0,3).forEach(function(entry, index) {
        if (index) details.appendChild(document.createElement('br'));
        details.appendChild(document.createTextNode(entry[0] + ': ' + entry[1]));
      });
    } else {
      details.textContent = ':';
    }
    var chain = document.createElement('td');
    var status = document.createElement('span');
    status.className = r._ok ? 'chain-ok': 'chain-fail';
    status.textContent = r._ok ? '✓ OK': '✗ BROKEN';
    chain.appendChild(status);
    tr.append(n, ts, eventCell, outcome, details, chain);
    tbody.appendChild(tr);
  });
}
function filterAudit() {
  var oc = document.getElementById('af-outcome').value;
  var ev = document.getElementById('af-event').value;
  var q  = document.getElementById('af-search').value.toLowerCase();
  renderAuditRows(auditRows.filter(r =>
    (!oc || r.outcome === oc) &&
    (!ev || r.event === ev) &&
    (!q  || JSON.stringify(r).toLowerCase().includes(q))
  ));
}

// ── Custom Rules ─────────────────────────────────────────────────────────
function liveRegex(inputId, statusId) {
  var val = document.getElementById(inputId).value;
  var el  = document.getElementById(statusId);
  if (!val) { el.textContent = ''; return; }
  try { new RegExp(val); el.textContent = '✓ Valid'; el.className = 'regex-ok'; }
  catch(e) { el.textContent = '✗ ' + e.message; el.className = 'regex-fail'; }
}
function addRule() {
  var id   = document.getElementById('r-id').value.trim();
  var desc = document.getElementById('r-desc').value.trim();
  var pat  = document.getElementById('r-pat').value.trim();
  var neg  = document.getElementById('r-neg').value.trim();
  if (!id || !desc || !pat) return alert('Rule ID, description, and a match pattern are all required. The negative pattern is optional.');
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(id)) return alert('Rule ID must start with a lowercase letter, followed by a-z, 0-9, or _ (max 64 chars). Example: no_credentials');
  if (desc.length > 200) return alert('Description cannot exceed 200 characters (' + desc.length + ' entered).');
  if (pat.length > 500) return alert('Match pattern cannot exceed 500 characters.');
  if (neg && neg.length > 500) return alert('Negative pattern cannot exceed 500 characters.');
  if (rules.find(r => r.id === id)) return alert('A rule with this ID already exists.');
  if (rules.length >= 25) return alert('Maximum 25 custom rules.');
  var rule = {
    id, description: desc,
    applies_to: document.getElementById('r-applies').value,
    severity:   document.getElementById('r-severity').value,
    risk_dimension: document.getElementById('r-dim').value,
    risk_weight: parseInt(document.getElementById('r-weight').value)
  };
  rule.pattern = pat;
  if (neg) rule.negative_pattern = neg;
  rules.push(rule);
  localStorage.setItem('pcp-rules', JSON.stringify(rules));
  renderRules();
  ['r-id','r-desc','r-pat','r-neg'].forEach(id => { document.getElementById(id).value = ''; });
  ['r-pat-s','r-neg-s'].forEach(id => { document.getElementById(id).textContent = ''; });
}
function removeRule(id) {
  rules = rules.filter(r => r.id !== id);
  localStorage.setItem('pcp-rules', JSON.stringify(rules));
  renderRules();
}
function renderRules() {
  var list = document.getElementById('rules-list');
  if (!rules.length) {
    var empty = document.createElement('p');
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '0.875rem';
    empty.style.margin = '0 0 16px';
    empty.textContent = 'No rules yet. Add your first rule above.';
    list.replaceChildren(empty);
    document.getElementById('rules-export').style.display = 'none';
    return;
  }
  list.replaceChildren();
  rules.forEach(function(r) {
    var item = document.createElement('div');
    item.className = 'rule-item';
    var header = document.createElement('div');
    header.className = 'rule-header';
    var id = document.createElement('span');
    id.className = 'rule-id';
    id.textContent = r.id;
    var actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.alignItems = 'center';
    var severity = document.createElement('span');
    severity.className = r.severity === 'BLOCKING' ? 'sev-blocking': 'sev-nonblocking';
    severity.textContent = r.severity;
    var remove = document.createElement('button');
    remove.className = 'btn btn-secondary btn-sm';
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', function() { removeRule(r.id); });
    actions.append(severity, remove);
    header.append(id, actions);
    var desc = document.createElement('p');
    desc.style.fontSize = '0.8rem';
    desc.style.color = 'var(--text-muted)';
    desc.style.margin = '0 0 8px';
    desc.textContent = r.description;
    var meta = document.createElement('div');
    meta.className = 'rule-meta';
    if (r.pattern) meta.appendChild(metaCode('Match: ', r.pattern));
    if (r.negative_pattern) meta.appendChild(metaCode('Must include: ', r.negative_pattern));
    meta.append(
      metaText('Applies: ' + r.applies_to),
      metaText('Dimension: ' + r.risk_dimension),
      metaText('Weight: ' + r.risk_weight + '/25')
    );
    item.append(header, desc, meta);
    list.appendChild(item);
  });
  var rulesJson = JSON.stringify({ rules }, null, 2);
  var rulesOnly = JSON.stringify(rules, null, 2);
  document.getElementById('rules-json').textContent = rulesJson;
  document.getElementById('rules-deploy-cmd').textContent =
    'Please use the save_custom_rules tool to deploy these governance rules to my Prompt Control Plane:\n\n' + rulesOnly;
  document.getElementById('rules-export').style.display = 'block';
}
function metaText(text) {
  var span = document.createElement('span');
  span.textContent = text;
  return span;
}
function metaCode(label, value) {
  var span = document.createElement('span');
  span.appendChild(document.createTextNode(label));
  var code = document.createElement('code');
  code.textContent = value;
  span.appendChild(code);
  return span;
}
function downloadRules() {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ rules }, null, 2)], { type: 'application/json' }));
  a.download = 'custom-rules.json';
  a.click();
}

// ── Copy helpers ─────────────────────────────────────────────────────────
function copyEl(id, btn) {
  navigator.clipboard.writeText(document.getElementById(id).textContent).then(() => flash(btn));
}
function copyText(t, btn) {
  navigator.clipboard.writeText(t).then(() => flash(btn));
}
function flash(btn) {
  if (!btn) return;
  var orig = btn.textContent;
  btn.textContent = 'Copied!';
  btn.style.background = 'var(--green)';
  btn.style.color = 'white';
  setTimeout(() => { btn.textContent = orig; btn.style.background = ''; btn.style.color = ''; }, 1600);
}

// ═══════════════════════════════════════════════════════════════════════
// ── Enterprise License Gate (WebCrypto Ed25519, fully offline) ────────
// ═══════════════════════════════════════════════════════════════════════
var GATE_SESSION_KEY = 'pcp-ent-session';

// Ed25519 public key DER bytes (base64 of the SPKI-encoded public key
// from src/license.ts PRODUCTION_PUBLIC_KEY_PEM, minus PEM headers)
var PUB_KEY_B64 = 'MCowBQYDK2VwAyEAJzmf726WMU0NJXnqbJfOdY0HwwyNtWDjZGK+8JAogv8=';

async function importEdPubKey() {
  var raw = Uint8Array.from(atob(PUB_KEY_B64), function(c) { return c.charCodeAt(0); });
  return crypto.subtle.importKey('spki', raw, { name: 'Ed25519' }, false, ['verify']);
}

function canonicalizeLicensePayload(p) {
  var sorted = {};
  Object.keys(p).sort().forEach(function(k) { sorted[k] = p[k]; });
  return JSON.stringify(sorted);
}

function base64urlDecodeStr(s) {
  // Normalise base64url → base64 and decode to a UTF-8 string
  var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  var pad = b64.length % 4;
  if (pad) b64 += '===='.slice(0, 4 - pad);
  return atob(b64);
}

async function validateLicenseKey(key) {
  if (!key || !key.startsWith('pcp_')) {
    return { valid: false, error: 'License key must start with pcp_' };
  }
  var encoded = key.slice(4);
  var decoded;
  try { decoded = base64urlDecodeStr(encoded); } catch(e) {
    return { valid: false, error: 'Invalid license key format' };
  }
  var envelope;
  try { envelope = JSON.parse(decoded); } catch(e) {
    return { valid: false, error: 'Malformed license key' };
  }
  if (!envelope || !envelope.payload || !envelope.signature_hex) {
    return { valid: false, error: 'Malformed license key' };
  }
  var p = envelope.payload;
  if (!p.tier || !p.issued_at || !p.expires_at || !p.license_id) {
    return { valid: false, error: 'Malformed license key: missing fields' };
  }
  // Tier check: enterprise only
  if (p.tier !== 'enterprise') {
    return { valid: false, error: 'This console requires an Enterprise license. Your key is ' + p.tier + ' tier. Contact sales to upgrade.' };
  }
  // Expiry check
  if (p.expires_at !== 'never') {
    var exp = new Date(p.expires_at);
    if (isNaN(exp.getTime()) || exp <= new Date()) {
      return { valid: false, error: 'License expired on ' + (isNaN(exp.getTime()) ? p.expires_at: exp.toLocaleDateString()) };
    }
  }
  // Ed25519 signature verification
  try {
    var canonical = canonicalizeLicensePayload(p);
    var sigBytes = new Uint8Array(envelope.signature_hex.match(/.{2}/g).map(function(h){ return parseInt(h, 16); }));
    var pubKey = await importEdPubKey();
    var ok = await crypto.subtle.verify({ name: 'Ed25519' }, pubKey, sigBytes, new TextEncoder().encode(canonical));
    if (!ok) return { valid: false, error: 'Invalid license signature: key may be tampered with' };
  } catch(e) {
    // Ed25519 in WebCrypto requires Chrome 113+, Firefox 113+, Safari 17+
    if (e.name === 'NotSupportedError' || e.name === 'TypeError') {
      // Graceful degradation: allow valid format with limited verification.
      console.warn('WebCrypto Ed25519 not supported: falling back to format-only validation');
    } else {
      return { valid: false, error: 'Signature verification failed: use a modern browser (Chrome 113+, Firefox 113+, Safari 17+)' };
    }
  }
  return { valid: true, payload: p };
}

async function gateVerify() {
  var key = document.getElementById('gate-key').value.trim();
  var btn = document.getElementById('gate-btn');
  var errEl = document.getElementById('gate-error');
  btn.textContent = 'Verifying…'; btn.disabled = true; errEl.textContent = '';
  var result = await validateLicenseKey(key);
  btn.disabled = false;
  if (!result.valid) {
    errEl.textContent = result.error;
    btn.textContent = 'Verify License Key';
    return;
  }
  // Store session (sessionStorage: expires when tab closes)
  sessionStorage.setItem(GATE_SESSION_KEY, JSON.stringify({
    key: key, payload: result.payload, verified_at: new Date().toISOString()
  }));
  showConsole(result.payload, key);
}

function showConsole(payload, licenseKey) {
  var gate = document.getElementById('license-gate');
  gate.style.opacity = '0';
  setTimeout(function() { gate.style.display = 'none'; }, 350);
  // Show session bar
  var bar = document.getElementById('session-bar');
  bar.style.display = 'block';
  document.getElementById('sb-license-id').textContent = 'License ID: ' + payload.license_id;
  document.getElementById('sb-expiry').textContent = payload.expires_at === 'never' ? '· No expiry': '· Expires ' + new Date(payload.expires_at).toLocaleDateString();
  // Auto-derive lock passphrase from license key (Phase 1.5)
  if (licenseKey) autoDeriveLockPassphrase(licenseKey);
}

async function autoDeriveLockPassphrase(licenseKey) {
  // Derive a 32-char hex passphrase from the license key: consistent across sessions
  var hash = await sha256hex(licenseKey + ':pcp-governance-lock:v1');
  var passphrase = hash.slice(0, 32);
  var passEl = document.getElementById('pol-pass');
  var noteEl = document.getElementById('pol-pass-note');
  if (passEl) {
    passEl.value = passphrase;
    passEl.readOnly = true;
  }
  if (noteEl) {
    noteEl.textContent = '✓ Auto-derived from your enterprise license: no need to remember this separately.';
  }
}

function signOut() {
  sessionStorage.removeItem(GATE_SESSION_KEY);
  document.getElementById('session-bar').style.display = 'none';
  var gate = document.getElementById('license-gate');
  gate.style.display = 'flex'; gate.style.opacity = '1';
  document.getElementById('gate-key').value = '';
  document.getElementById('gate-error').textContent = '';
  document.getElementById('gate-btn').textContent = 'Verify License Key';
  // Clear the derived passphrase
  var passEl = document.getElementById('pol-pass');
  var noteEl = document.getElementById('pol-pass-note');
  if (passEl) passEl.value = '';
  if (noteEl) noteEl.textContent = '';
}

// ── Check existing session on page load ───────────────────────────────
(async function initGate() {
  // Hide the gate immediately until we check session
  document.getElementById('license-gate').style.display = 'none';
  var stored = sessionStorage.getItem(GATE_SESSION_KEY);
  if (stored) {
    try {
      var s = JSON.parse(stored);
      var result = await validateLicenseKey(s.key);
      if (result.valid) { showConsole(result.payload, s.key); return; }
    } catch(e) { /* fall through */ }
    sessionStorage.removeItem(GATE_SESSION_KEY);
  }
  // Show gate
  document.getElementById('license-gate').style.display = 'flex';
  document.getElementById('license-gate').style.opacity = '1';
})();

// ── Sidebar active on scroll ─────────────────────────────────────────────
window.addEventListener('scroll', function() {
  var scrollY = window.scrollY + 110;
  document.querySelectorAll('.admin-section').forEach(function(s) {
    if (s.offsetTop <= scrollY && s.offsetTop + s.offsetHeight > scrollY) {
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      var link = document.querySelector('.sidebar-nav a[href="#' + s.id + '"]');
      if (link) link.classList.add('active');
    }
  });
});

// ── CSP-safe event bindings ──────────────────────────────────────────────
document.getElementById('gate-key').addEventListener('input', function() {
  document.getElementById('gate-error').textContent = '';
});
document.getElementById('gate-key').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') gateVerify();
});
document.getElementById('gate-btn').addEventListener('click', gateVerify);
document.getElementById('session-signout').addEventListener('click', signOut);

['opt-mode', 'opt-target', 'opt-strictness', 'opt-ephemeral'].forEach(function(id) {
  document.getElementById(id).addEventListener('change', updateOptimizerCmd);
});
['opt-maxsess', 'opt-retention'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', updateOptimizerCmd);
});
document.getElementById('opt-threshold').addEventListener('input', function(event) {
  document.getElementById('opt-tval').textContent = event.currentTarget.value;
  updateOptimizerCmd();
});

['pol-mode', 'pol-strictness', 'pol-audit'].forEach(function(id) {
  document.getElementById(id).addEventListener('change', updatePolicyCmd);
});
document.getElementById('generate-lock').addEventListener('click', genLock);
document.getElementById('generate-unlock').addEventListener('click', genUnlock);

['sess-age', 'sess-keep'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', updateSessionCmd);
});
document.getElementById('sess-dry').addEventListener('change', updateSessionCmd);

document.getElementById('parse-audit').addEventListener('click', parseAudit);
document.getElementById('clear-audit').addEventListener('click', function() {
  document.getElementById('audit-input').value = '';
  document.getElementById('audit-results').style.display = 'none';
});
['af-outcome', 'af-event'].forEach(function(id) {
  document.getElementById(id).addEventListener('change', filterAudit);
});
document.getElementById('af-search').addEventListener('input', filterAudit);

document.getElementById('r-pat').addEventListener('input', function() {
  liveRegex('r-pat', 'r-pat-s');
});
document.getElementById('r-neg').addEventListener('input', function() {
  liveRegex('r-neg', 'r-neg-s');
});
document.getElementById('r-weight').addEventListener('input', function(event) {
  document.getElementById('r-wval').textContent = event.currentTarget.value;
});
document.getElementById('add-rule').addEventListener('click', addRule);
document.getElementById('download-rules').addEventListener('click', downloadRules);

document.querySelectorAll('[data-copy-element]').forEach(function(button) {
  button.addEventListener('click', function() {
    copyEl(button.dataset.copyElement, button);
  });
});
document.querySelectorAll('[data-copy-text]').forEach(function(button) {
  button.addEventListener('click', function() {
    copyText(button.dataset.copyText, button);
  });
});

// ── Init ─────────────────────────────────────────────────────────────────
updateOptimizerCmd();
updatePolicyCmd();
updateSessionCmd();
renderRules();

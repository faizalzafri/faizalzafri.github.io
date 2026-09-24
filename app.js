// Renders the whole page from openapi.yaml. Edit the YAML, not this file.
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = (s) =>
  esc(s).split(/\n{2,}/).filter((x) => x.trim())
    .map((p) => "<p>" + p.replace(/\n/g, " ").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>") + "</p>").join("");
const refName = (ref) => ref.split("/").pop();
const isHttp = location.protocol.startsWith("http");

let spec;

fetch("openapi.yaml")
  .then((r) => r.text())
  .then((t) => { spec = jsyaml.load(t); render(); })
  .catch(() => {
    document.getElementById("info").innerHTML =
      `<p class="muted">Could not load openapi.yaml. Preview with <code>python -m http.server 8000</code>.</p>`;
  });

function render() {
  renderInfo();
  renderOperations();
  renderSchemas();
}

/* ---------- header ---------- */
function renderInfo() {
  const { info, servers = [], openapi } = spec;
  document.title = `${info.title} — Portfolio API`;
  const opts = servers.map((s, i) => `<option value="${i}">${esc(absUrl(s.url))}${s.description ? " — " + esc(s.description) : ""}</option>`).join("");
  document.getElementById("info").innerHTML = `
    <div class="title-row">
      <h1>${esc(info.title)} <span class="muted">/ ${esc(info.summary || "api")}</span></h1>
      <span class="badge">v${esc(info.version)}</span>
      <span class="badge badge-oas">OAS ${esc(openapi)}</span>
    </div>
    <div class="desc-md">${md(info.description)}</div>
    <div class="server"><span class="label">Servers</span><select id="server">${opts}</select></div>
    <div class="info-links">
      <a href="openapi.yaml" download>openapi.yaml</a>
      ${info.contact?.url ? `<a href="${esc(info.contact.url)}" rel="noopener">Contact ${esc(info.contact.name || "")}</a>` : ""}
      ${info.license ? `<span class="muted">License: ${esc(info.license.name)}</span>` : ""}
    </div>`;
}

function absUrl(u) {
  const base = isHttp ? location.href : "http://localhost:8000/";
  return new URL(u.replace(/^\//, ""), new URL(".", base)).href.replace(/\/$/, "");
}
const serverUrl = () => absUrl(spec.servers[+document.getElementById("server").value || 0].url);

/* ---------- operations grouped by tag ---------- */
function renderOperations() {
  const groups = new Map((spec.tags || []).map((t) => [t.name, { tag: t, ops: [] }]));
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(item)) {
      const tag = op.tags?.[0] || "default";
      if (!groups.has(tag)) groups.set(tag, { tag: { name: tag }, ops: [] });
      groups.get(tag).ops.push({ path, method, op });
    }
  }
  const root = document.getElementById("tags");
  for (const { tag, ops } of groups.values()) {
    if (!ops.length) continue;
    const sec = document.createElement("section");
    sec.className = "tag";
    sec.innerHTML = `<h2>${esc(tag.name)} <span class="muted">${esc(tag.description || "")}</span></h2>`;
    ops.forEach((o) => sec.appendChild(renderOp(o)));
    root.appendChild(sec);
  }
}

function renderOp({ path, method, op }) {
  const el = document.createElement("details");
  el.className = "op";
  el.id = op.operationId || "";
  const params = op.parameters || [];

  el.innerHTML = `
    <summary>
      <span class="method">${method.toUpperCase()}</span>
      <code class="path">${esc(path)}</code>
      <span class="summary">${esc(op.summary)}</span>
      <svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 8l4 4 4-4" /></svg>
    </summary>
    <div class="op-body">
      <p class="desc">${esc(op.description)}</p>
      <div class="block-head"><h3>Parameters</h3><button class="btn btn-exec" type="button">Execute</button></div>
      ${params.length ? paramTable(params) : `<p class="muted small">No parameters</p>`}
      <div class="block-head"><h3>Responses</h3></div>
      ${respTable(op.responses)}
      <div class="result" hidden>
        <div class="block-head"><h3>Live response</h3><button class="btn btn-ghost btn-clear" type="button">Clear</button></div>
        <p class="label">Curl</p><pre class="code curl"></pre>
        <p class="label">Request URL</p><pre class="code req-url"></pre>
        <div class="status-row"><p class="label">Server response</p><span class="status"></span><span class="timing muted small"></span></div>
        <div class="body-wrap"><button class="btn btn-ghost btn-copy" type="button">Copy</button><pre class="code json"></pre></div>
      </div>
    </div>`;

  el.querySelector(".btn-exec").addEventListener("click", () => run(el, path, method, params));
  el.querySelector(".btn-clear").addEventListener("click", () => (el.querySelector(".result").hidden = true));
  el.querySelector(".btn-copy").addEventListener("click", (e) => {
    navigator.clipboard?.writeText(el.querySelector(".json").textContent);
    e.target.textContent = "Copied";
    setTimeout(() => (e.target.textContent = "Copy"), 1200);
  });
  return el;
}

function paramTable(params) {
  const rows = params.map((p) => {
    const s = p.schema || {};
    const input = s.enum
      ? `<select data-p="${esc(p.name)}">${s.enum.map((v) => `<option ${v === s.default ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`
      : `<input data-p="${esc(p.name)}" value="${esc(s.default ?? "")}" placeholder="${esc(p.name)}" />`;
    return `<tr>
      <td><div class="pname">${esc(p.name)}${p.required ? '<span class="req">*</span>' : ""}</div>
          <div class="pmeta">${esc(s.type || "")} <span class="pin">(${esc(p.in)})</span></div></td>
      <td><div class="small">${esc(p.description || "")}</div>${input}</td>
    </tr>`;
  }).join("");
  return `<table class="params"><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function respTable(responses = {}) {
  const rows = Object.entries(responses).map(([code, r]) => {
    const schema = r.content?.["application/json"]?.schema;
    const link = schema?.$ref ? `<a class="schema-link" href="#schema-${refName(schema.$ref)}">${refName(schema.$ref)}</a>` : "";
    return `<tr><td class="code-num c${code[0]}">${esc(code)}</td><td>${esc(r.description)} ${link}</td></tr>`;
  }).join("");
  return `<table class="resp-table">${rows}</table>`;
}

/* ---------- execute ---------- */
async function run(el, path, method, params) {
  const exec = el.querySelector(".btn-exec");
  const status = el.querySelector(".status");
  const out = el.querySelector(".json");
  let p = path;
  const query = new URLSearchParams();
  for (const prm of params) {
    const v = el.querySelector(`[data-p="${prm.name}"]`)?.value ?? "";
    if (prm.in === "path") p = p.replace(`{${prm.name}}`, encodeURIComponent(v));
    if (prm.in === "query" && v) query.set(prm.name, v);
  }
  const url = serverUrl() + p + (query.toString() ? "?" + query : "");

  exec.disabled = true;
  exec.textContent = "Loading…";
  el.querySelector(".curl").textContent = `curl -X ${method.toUpperCase()} "${url}" \\\n  -H "accept: application/json"`;
  el.querySelector(".req-url").textContent = url;

  const t0 = performance.now();
  try {
    const res = await fetch(url, { method: method.toUpperCase(), headers: { accept: "application/json" }, cache: "no-cache" });
    const text = await res.text();
    status.textContent = `${res.status} ${res.statusText || (res.ok ? "OK" : "")}`.trim();
    status.className = "status " + (res.ok ? "ok" : "err");
    el.querySelector(".timing").textContent = `${Math.round(performance.now() - t0)} ms`;
    try { out.innerHTML = highlight(JSON.stringify(JSON.parse(text), null, 2)); }
    catch { out.textContent = res.ok ? text : `${res.status}: not found`; }
  } catch (err) {
    status.textContent = "Failed to fetch";
    status.className = "status err";
    out.textContent = String(err);
  } finally {
    exec.disabled = false;
    exec.textContent = "Execute";
    el.querySelector(".result").hidden = false;
  }
}

function highlight(json) {
  return json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (m) => {
      let cls = "j-num";
      if (m.startsWith("&quot;") || m.startsWith('"')) cls = /:\s*$/.test(m) ? "j-key" : "j-str";
      else if (/true|false|null/.test(m)) cls = "j-bool";
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

/* ---------- schemas ---------- */
function typeLabel(s = {}) {
  if (s.$ref) return `<a href="#schema-${refName(s.$ref)}">${refName(s.$ref)}</a>`;
  if (s.type === "array") return `array[${typeLabel(s.items)}]`;
  if (s.type === "object" && s.additionalProperties) return `map[string, ${typeLabel(s.additionalProperties)}]`;
  const t = Array.isArray(s.type) ? s.type.join(" | ") : s.type || "any";
  return esc(t + (s.format ? ` (${s.format})` : "") + (s.enum ? ` ∈ {${s.enum.join(", ")}}` : ""));
}

function renderSchemas() {
  const schemas = spec.components?.schemas;
  if (!schemas) return;
  const root = document.getElementById("schemas");
  root.innerHTML = Object.entries(schemas).map(([name, s]) => {
    const req = new Set(s.required || []);
    const props = s.properties
      ? Object.entries(s.properties).map(([k, v]) => `
          <div class="prop">
            <span class="k">${esc(k)}${req.has(k) ? '<span class="req">*</span>' : ""}</span>
            <span class="t">${typeLabel(v)}${v.example !== undefined ? ` <span class="ex">e.g. ${esc(v.example)}</span>` : ""}${v.description ? ` <span class="ex">— ${esc(v.description)}</span>` : ""}</span>
          </div>`).join("")
      : `<div class="prop"><span class="k">&lt;key&gt;</span><span class="t">${typeLabel(s.additionalProperties)}</span></div>`;
    return `<details class="model" id="schema-${esc(name)}">
      <summary>${esc(name)} <span class="muted">${esc(s.type || "")}</span></summary>
      <div class="props">${props}</div>
    </details>`;
  }).join("");
  document.getElementById("schemas-section").hidden = false;

  // clicking a schema link opens it
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#schema-"]');
    if (a) document.querySelector(a.getAttribute("href"))?.setAttribute("open", "");
  });
}

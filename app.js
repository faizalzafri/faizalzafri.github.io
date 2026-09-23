// Endpoint catalogue. To add an endpoint: drop a JSON file in /api and add a line here.
const ENDPOINTS = [
  { path: "/api/bio.json",        summary: "Who I am",                 desc: "Returns a short biography, current role and location." },
  { path: "/api/experience.json", summary: "Work history",             desc: "Returns professional experience, most recent first." },
  { path: "/api/stack.json",      summary: "Tech stack",               desc: "Returns languages, frameworks and tools I use, grouped by area." },
  { path: "/api/projects.json",   summary: "Selected projects",        desc: "Returns side projects and open-source work with links." },
  { path: "/api/contact.json",    summary: "How to reach me",          desc: "Returns contact channels. Response time: usually within a day." },
];

const base = new URL(".", location.href);            // works at user.github.io/ and user.github.io/repo/
const isHttp = location.protocol.startsWith("http");
document.getElementById("server-url").textContent = isHttp ? base.href.replace(/\/$/, "") : "http://localhost:8000";

const tpl = document.getElementById("op-template");
const ops = document.getElementById("ops");

ENDPOINTS.forEach((ep) => {
  const node = tpl.content.cloneNode(true);
  const $ = (s) => node.querySelector(s);
  $(".path").textContent = ep.path;
  $(".summary").textContent = ep.summary;
  $(".desc").textContent = ep.desc;

  const el = $(".op");
  const exec = $(".btn-exec");
  const result = $(".result");
  const url = new URL(ep.path.replace(/^\//, ""), base).href;

  exec.addEventListener("click", () => run(el, url));
  $(".btn-clear").addEventListener("click", () => { result.hidden = true; });
  $(".btn-copy").addEventListener("click", (e) => {
    navigator.clipboard?.writeText(el.querySelector(".json").textContent);
    e.target.textContent = "Copied";
    setTimeout(() => (e.target.textContent = "Copy"), 1200);
  });
  ops.appendChild(node);
});

async function run(el, url) {
  const exec = el.querySelector(".btn-exec");
  const result = el.querySelector(".result");
  const status = el.querySelector(".status");
  const out = el.querySelector(".json");

  exec.disabled = true;
  exec.textContent = "Loading…";
  el.querySelector(".curl").textContent = `curl -X GET "${url}" \\\n  -H "accept: application/json"`;
  el.querySelector(".req-url").textContent = url;

  const t0 = performance.now();
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-cache" });
    const ms = Math.round(performance.now() - t0);
    const text = await res.text();
    status.textContent = `${res.status} ${res.statusText || (res.ok ? "OK" : "")}`.trim();
    status.className = "status " + (res.ok ? "ok" : "err");
    el.querySelector(".timing").textContent = `${ms} ms · application/json`;
    try { out.innerHTML = highlight(JSON.stringify(JSON.parse(text), null, 2)); }
    catch { out.textContent = text; }
  } catch (err) {
    status.textContent = "Failed to fetch";
    status.className = "status err";
    el.querySelector(".timing").textContent = "";
    out.textContent = isHttp
      ? String(err)
      : "Browsers block fetch() on file:// pages.\nPreview locally with:  python -m http.server 8000\nthen open http://localhost:8000";
  } finally {
    exec.disabled = false;
    exec.textContent = "Execute";
    result.hidden = false;
  }
}

function highlight(json) {
  const esc = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (m) => {
      let cls = "j-num";
      if (m.startsWith('"')) cls = m.endsWith(":") ? "j-key" : "j-str";
      else if (/true|false|null/.test(m)) cls = "j-bool";
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

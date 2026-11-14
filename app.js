/* ============ DADOS ============ */
const KD = "taskflow_demandas", KU = "taskflow_usuario";
const STATUS = ["Pendente", "Em andamento", "Concluído"];
const COR = { "Pendente": "warning text-dark", "Em andamento": "primary", "Concluído": "success" };
const HEX = ["#f39c12", "#2980b9", "#27ae60"];
const PRI = { "Alta": "danger", "Média": "info text-dark", "Baixa": "secondary" };

const carregarDemandas = () => (JSON.parse(localStorage.getItem(KD)) || []).map(d => d.status === "Em revisão" ? { ...d, status: "Em andamento" } : d);
const salvarDemandas = d => localStorage.setItem(KD, JSON.stringify(d));
const carregarUsuario = () => JSON.parse(localStorage.getItem(KU)) || { nome: "Seu Nome", foto: "" };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

if (!localStorage.getItem(KD)) {
    const hoje = new Date().toISOString().slice(0, 10);
    salvarDemandas([
        { id: 1, titulo: "Landing Page Black Friday", descricao: "", responsavel: "João", prioridade: "Alta", status: "Em andamento", data: hoje },
        { id: 2, titulo: "Banner Institucional", descricao: "", responsavel: "Maria", prioridade: "Média", status: "Concluído", data: hoje },
        { id: 3, titulo: "Cadastro Cliente", descricao: "", responsavel: "Carlos", prioridade: "Baixa", status: "Pendente", data: hoje },
        { id: 4, titulo: "Aprovação de Mídia", descricao: "", responsavel: "Maria", prioridade: "Alta", status: "Em andamento", data: hoje }
    ]);
}

/* ============ LAYOUT (menu, topo, modais) ============ */
const PAGES = [["dashboard", "fa-chart-pie", "Dashboard"], ["kanban", "fa-table-columns", "Kanban"], ["demandas", "fa-list", "Demandas"], ["relatorios", "fa-chart-line", "Relatórios"]];
const pagina = document.body.dataset.page;
const avatar = u => u.foto ? `<img src="${u.foto}" class="avatar" alt="">` : `<span class="avatar ini">${esc(u.nome.trim()[0] || "?").toUpperCase()}</span>`;
const campo = (id, label, tipo = "text") => `<label class="form-label mb-1">${label}</label><input id="${id}" type="${tipo}" class="form-control mb-3">`;
const sel = (id, label, op) => `<label class="form-label mb-1">${label}</label><select id="${id}" class="form-select mb-3">${op.map(o => `<option>${o}</option>`).join("")}</select>`;

function montarLayout(titulo) {
    const u = carregarUsuario(), busca = ["kanban", "demandas"].includes(pagina);
    document.getElementById("app").innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="logo"><i class="fa-solid fa-check"></i> TaskFlow</div>
        <ul>${PAGES.map(p => `<li class="${p[0] == pagina ? "active" : ""}"><a href="${p[0]}.html"><i class="fa-solid ${p[1]}"></i> ${p[2]}</a></li>`).join("")}</ul>
      </aside>
      <main class="content">
        <header class="topbar">
          ${busca ? `<div class="d-flex gap-2 flex-wrap"><input id="busca" placeholder="Pesquisar demanda" oninput="render()"><select id="ordem" class="form-select w-auto" onchange="render()"><option value="">Ordem padrão</option><option value="prazo">Prazo mais próximo primeiro</option><option value="atrasadas">Só atrasadas</option><option value="semana">Vencem em até 7 dias</option></select></div>` : "<span></span>"}
          <div class="user-info">
            <button class="btn btn-success" onclick="abrirDemanda()"><i class="fa-solid fa-plus"></i> Nova Demanda</button>
            <a href="#" onclick="abrirPerfil();return false" class="d-flex align-items-center gap-2 text-dark text-decoration-none" title="Editar perfil">${avatar(u)}<span>${esc(u.nome)}</span></a>
          </div>
        </header>
        <h3 class="mt-4 mb-3">${titulo}</h3>
        <div id="conteudo"></div>
      </main>
    </div>
    <div class="modal fade" id="mDemanda" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title" id="mTitulo">Nova Demanda</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body"><input type="hidden" id="dId">
        ${campo("dTitulo", "Título *")}
        <label class="form-label mb-1">Descrição</label><textarea id="dDesc" class="form-control mb-3" rows="3"></textarea>
        ${campo("dResp", "Responsável")}
        <div class="row"><div class="col">${sel("dPri", "Prioridade", Object.keys(PRI))}</div><div class="col">${sel("dStatus", "Status", STATUS)}</div></div>
        <div class="row"><div class="col">${campo("dData", "Data de criação", "date")}</div><div class="col">${campo("dPrazo", "Prazo de entrega", "date")}</div></div>${campo("dEmail", "E-mail do responsável (para lembretes)", "email")}
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-success" onclick="salvarDemanda()">Salvar demanda</button></div>
    </div></div></div>
    <div class="modal fade" id="mPerfil" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Meu perfil</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body text-center">
        <div id="prev" class="mb-3"></div>
        <input type="file" accept="image/*" class="form-control mb-3" onchange="lerFoto(this)">
        <button class="btn btn-sm btn-outline-secondary mb-3" onclick="tmpFoto='';prevFoto()">Remover foto</button>
        <div class="text-start">${campo("pNome", "Nome")}</div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button><button class="btn btn-success" onclick="salvarPerfil()">Salvar perfil</button></div>
    </div></div></div>`;
}
const modal = id => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
const val = id => document.getElementById(id).value;

/* ============ DEMANDAS (criar, editar, excluir, mover) ============ */
function abrirDemanda(id) {
    const d = carregarDemandas().find(x => x.id === id) || { id: "", titulo: "", descricao: "", responsavel: "", prioridade: "Média", status: "Pendente", data: new Date().toISOString().slice(0, 10), prazo: "", email: "" };
    document.getElementById("mTitulo").textContent = id ? "Editar Demanda" : "Nova Demanda";
    dId.value = d.id; dTitulo.value = d.titulo; dDesc.value = d.descricao; dResp.value = d.responsavel;
    dPri.value = d.prioridade; dStatus.value = d.status; dData.value = d.data; dPrazo.value = d.prazo || ""; dEmail.value = d.email || "";
    modal("mDemanda").show();
}
function salvarDemanda() {
    if (!val("dTitulo").trim()) { dTitulo.classList.add("is-invalid"); return; }
    dTitulo.classList.remove("is-invalid");
    const lista = carregarDemandas(), id = Number(val("dId"));
    const d = { id: id || Math.max(0, ...lista.map(x => x.id)) + 1, titulo: val("dTitulo").trim(), descricao: val("dDesc"), responsavel: val("dResp"), prioridade: val("dPri"), status: val("dStatus"), data: val("dData"), prazo: val("dPrazo"), email: val("dEmail") };
    const i = lista.findIndex(x => x.id === id);
    i >= 0 ? lista[i] = d : lista.push(d);
    salvarDemandas(lista); modal("mDemanda").hide(); render();
}
function excluirDemanda(id) {
    if (confirm("Excluir esta demanda?")) { salvarDemandas(carregarDemandas().filter(d => d.id !== id)); render(); }
}
function soltar(e, status) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text"));
    salvarDemandas(carregarDemandas().map(d => d.id === id ? { ...d, status } : d)); render();
}

/* ============ PERFIL ============ */
let tmpFoto = "";
function prevFoto() { prev.innerHTML = avatar({ nome: val("pNome") || "?", foto: tmpFoto }).replace('class="avatar', 'style="width:96px;height:96px;font-size:36px" class="avatar'); }
function abrirPerfil() { const u = carregarUsuario(); tmpFoto = u.foto; pNome.value = u.nome; prevFoto(); modal("mPerfil").show(); }
function lerFoto(inp) {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas"); c.width = c.height = 128;
            const s = Math.min(img.width, img.height);
            c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
            tmpFoto = c.toDataURL("image/jpeg", .85); prevFoto();
        };
        img.src = e.target.result;
    };
    r.readAsDataURL(f);
}
function salvarPerfil() {
    localStorage.setItem(KU, JSON.stringify({ nome: val("pNome").trim() || "Seu Nome", foto: tmpFoto }));
    location.reload();
}

/* ============ TELAS ============ */
const contar = D => STATUS.map(s => D.filter(d => d.status === s).length);
const cards = (D, cls) => { const n = contar(D); return `<div class="row g-3">${STATUS.map((s, i) => `<div class="${cls}"><div class="stat-card ${["orange", "blue", "green"][i]}"><span>${s}</span><h2>${n[i]}</h2></div></div>`).join("")}</div>`; };
const badge = (t, c) => `<span class="badge bg-${c}">${esc(t)}</span>`;
const filtrar = () => { const q = (document.getElementById("busca")?.value || "").toLowerCase(); let L = carregarDemandas().filter(d => d.titulo.toLowerCase().includes(q));
    const o = document.getElementById("ordem")?.value;
    if (o === "atrasadas") L = L.filter(atrasada);
    if (o === "semana") { const f = new Date(Date.now() + 7 * 864e5).toLocaleDateString("sv-SE"); L = L.filter(d => d.prazo && d.status !== "Concluído" && d.prazo <= f); }
    if (o) L.sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999"));
    return L; };
const hojeLocal = () => new Date().toLocaleDateString("sv-SE");
const fmt = s => s ? s.split("-").reverse().join("/") : "—";
const atrasada = d => d.prazo && d.status !== "Concluído" && d.prazo < hojeLocal();
function lembrar(id) {
    const d = carregarDemandas().find(x => x.id === id);
    const msg = `Olá ${d.responsavel}, a demanda "${d.titulo}" venceu em ${fmt(d.prazo)} e ainda não foi concluída. Pode atualizar o status?`;
    location.href = `mailto:${d.email || ""}?subject=${encodeURIComponent("Lembrete: " + d.titulo)}&body=${encodeURIComponent(msg)}`;
}
const grafico = (id, cfg) => new Chart(document.getElementById(id), cfg);

const TELAS = {
    dashboard: ["Dashboard", () => {
        const D = carregarDemandas(), atr = D.filter(atrasada), rec = [...D].sort((a, b) => b.id - a.id).slice(0, 5);
        conteudo.innerHTML = cards(D, "col-md-4") + (atr.length ? `<div class="alert alert-danger mt-3 mb-0"><i class="fa-solid fa-triangle-exclamation"></i> ${atr.length} demanda(s) atrasada(s): ${atr.map(d => esc(d.titulo)).join(", ")}</div>` : "") + `<div class="row mt-4 g-3">
          <div class="col-md-7"><div class="box-card"><h5>Demandas por status</h5><canvas id="g1"></canvas></div></div>
          <div class="col-md-5"><div class="box-card"><h5>Atividade recente</h5>
            ${rec.length ? `<ul class="activity">${rec.map(d => `<li>${esc(d.titulo)} ${badge(d.status, COR[d.status])}</li>`).join("")}</ul>` : `<p class="vazio">Nenhuma demanda ainda. Crie a primeira!</p>`}
            <button class="btn btn-primary mt-3" onclick="abrirDemanda()">+ Nova Demanda</button></div></div></div>`;
        grafico("g1", { type: "bar", data: { labels: STATUS, datasets: [{ label: "Demandas", data: contar(D), backgroundColor: HEX }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    }],
    kanban: ["Kanban", () => {
        const D = filtrar();
        conteudo.innerHTML = `<div class="kanban-board">${STATUS.map(s => {
            const col = D.filter(d => d.status === s);
            return `<div class="kanban-column" ondragover="event.preventDefault()" ondrop="soltar(event,'${s}')"><h5>${s} ${badge(col.length, "secondary")}</h5>
            ${col.map(d => `<div class="task-card" draggable="true" ondragstart="event.dataTransfer.setData('text',${d.id})" onclick="abrirDemanda(${d.id})"><strong>${esc(d.titulo)}</strong><div class="small text-muted my-1">${esc(d.responsavel)}</div>${badge(d.prioridade, PRI[d.prioridade])} ${atrasada(d) ? badge("Atrasada", "danger") : ""}${d.prazo ? `<div class="small text-muted mt-1"><i class="fa-regular fa-calendar"></i> ${fmt(d.prazo)}</div>` : ""}</div>`).join("")}</div>`;
        }).join("")}</div><p class="small text-muted mt-2">Arraste os cards entre as colunas para mudar o status. Clique em um card para editar.</p>`;
    }],
    demandas: ["Lista de Demandas", () => {
        const D = filtrar();
        conteudo.innerHTML = D.length ? `<div class="table-responsive"><table class="table table-hover bg-white align-middle"><thead class="table-dark"><tr><th>ID</th><th>Título</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Criada em</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>
          ${D.map(d => `<tr><td>${String(d.id).padStart(3, "0")}</td><td>${esc(d.titulo)}</td><td>${esc(d.responsavel)}</td><td>${badge(d.prioridade, PRI[d.prioridade])}</td><td>${badge(d.status, COR[d.status])}</td><td>${fmt(d.data)}</td><td>${fmt(d.prazo)} ${atrasada(d) ? badge("Atrasada", "danger") : ""}</td>
          <td>${atrasada(d) ? `<button class="btn btn-sm btn-warning" onclick="lembrar(${d.id})" title="Enviar lembrete por e-mail"><i class="fa-regular fa-envelope"></i></button> ` : ""}<button class="btn btn-sm btn-primary" onclick="abrirDemanda(${d.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirDemanda(${d.id})">Excluir</button></td></tr>`).join("")}</tbody></table></div>`
            : `<p class="vazio">Nenhuma demanda encontrada.</p>`;
    }],
    relatorios: ["Relatórios", () => {
        const D = carregarDemandas(), m = {};
        D.forEach(d => { const k = (d.data || "").slice(0, 7); if (k) m[k] = (m[k] || 0) + 1; });
        const ks = Object.keys(m).sort();
        conteudo.innerHTML = cards(D, "col-md-4") + `<div class="row mt-4 g-3">
          <div class="col-md-8"><div class="box-card"><h5>Demandas por mês</h5><canvas id="g1"></canvas></div></div>
          <div class="col-md-4"><div class="box-card"><h5>Status das demandas</h5><canvas id="g2"></canvas></div></div></div>`;
        grafico("g1", { type: "bar", data: { labels: ks.map(k => k.slice(5) + "/" + k.slice(2, 4)), datasets: [{ label: "Demandas", data: ks.map(k => m[k]), backgroundColor: "#173F6B" }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
        grafico("g2", { type: "pie", data: { labels: STATUS, datasets: [{ data: contar(D), backgroundColor: HEX }] } });
    }]
};

function render() { TELAS[pagina][1](); }
montarLayout(TELAS[pagina][0]);
render();

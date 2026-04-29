/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;

/* Filtros principais */
let filtroTipo = null;                 // "Terminais" ou "Acessórios"
let filtroGiro = [];                   // ["Alto Giro", "Baixo Giro"]
let filtroDep = [];                    // ["UDEI", "USAD"]
let filtroTecnologias = [];            // tecnologias selecionadas
let filtroLocais = [];                 // locais selecionados

/*************************************************
 * FUNÇÕES UTILITÁRIAS
 *************************************************/
function extrairDia(data) {
  if (data instanceof Date) return data.getDate();

  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    return new Date(base.getTime() + data * 86400000).getDate();
  }

  const d = new Date(data);
  return isNaN(d) ? null : d.getDate();
}

/*************************************************
 * CARREGAMENTO DO EXCEL
 *************************************************/
fetch("Dados.xlsx")
  .then(r => r.arrayBuffer())
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);

    criarFiltroLocal();
    configurarModal();

    atualizarTudo();
  });

/*************************************************
 * FILTRO DE LOCAL (FORA DO MODAL)
 *************************************************/
function criarFiltroLocal() {
  const select = document.getElementById("select-local");
  select.innerHTML = "";

  const locais = [...new Set(dados.map(d => d.Local).filter(v => v))];

  locais.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent = l;
    select.appendChild(opt);
  });

  select.onchange = () => {
    filtroLocais = [...select.selectedOptions].map(o => o.value);
    atualizarTudo();
  };
}

/*************************************************
 * MODAL DE FILTROS
 *************************************************/
function configurarModal() {
  const modal = document.getElementById("modal-filtros");
  const btnAbrir = document.getElementById("btn-filtros");
  const btnAplicar = document.getElementById("btn-aplicar");
  const btnLimpar = document.getElementById("btn-limpar");

  btnAbrir.onclick = () => modal.style.display = "block";

  window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  /* Tipo (Terminais / Acessórios) */
  document.querySelectorAll("input[name='tipo']").forEach(radio => {
    radio.onchange = () => {
      filtroTipo = radio.value;
      montarTecnologias();
    };
  });

  /* Aplicar filtros */
  btnAplicar.onclick = () => {
    filtroGiro = [...document.querySelectorAll(".chk-giro:checked")]
      .map(c => c.value);

    filtroDep = [...document.querySelectorAll(".chk-dep:checked")]
      .map(c => c.value);

    modal.style.display = "none";
    atualizarTudo();
  };

  /* Limpar filtros */
  btnLimpar.onclick = () => {
    filtroTipo = null;
    filtroGiro = [];
    filtroDep = [];
    filtroTecnologias = [];

    document.querySelectorAll("#modal-filtros input").forEach(i => i.checked = false);
    document.getElementById("lista-tecnologia").innerHTML = "";

    atualizarTudo();
  };
}

/*************************************************
 * TECNOLOGIAS (DINÂMICAS)
 *************************************************/
function montarTecnologias() {
  const div = document.getElementById("lista-tecnologia");
  div.innerHTML = "";
  filtroTecnologias = [];

  if (!filtroTipo) return;

  // Base já filtrada por Tipo, Giro e Dep.
  const base = dados
    .filter(d => d[filtroTipo])
    .filter(d => filtroGiro.length === 0 || filtroGiro.includes(d.Giro))
    .filter(d => filtroDep.length === 0 || filtroDep.includes(d["Dep."]));

  const tecnologias = [
    ...new Set(
      base
        .map(d => d[filtroTipo])
        .filter(v => v && v.toString().trim() !== "")
    )
  ];

  tecnologias.forEach(t => {
    const label = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = t;

    chk.onchange = () => {
      filtroTecnologias =
        [...div.querySelectorAll("input:checked")].map(c => c.value);
    };

    label.appendChild(chk);
    label.append(" " + t);
    div.appendChild(label);
  });
}


/*************************************************
 * FILTRO CENTRAL (USADO EM TUDO)
 *************************************************/
function aplicarFiltros() {
  return dados
    .filter(d => filtroLocais.length === 0 || filtroLocais.includes(d.Local))
    .filter(d => !filtroTipo || d[filtroTipo])
    .filter(d => filtroGiro.length === 0 || filtroGiro.includes(d.Giro))
    .filter(d => filtroDep.length === 0 || filtroDep.includes(d["Dep."]))
    .filter(d =>
      filtroTecnologias.length === 0 ||
      filtroTecnologias.includes(d[filtroTipo])
    );
}

/*************************************************
 * ATUALIZAÇÃO GERAL
 *************************************************/
function atualizarTudo() {
  atualizarKPIs();
  atualizarGrafico();
  atualizarResumoSemanal();
}

/*************************************************
 * KPIs
 *************************************************/
function atualizarKPIs() {
  const base = aplicarFiltros();

  const totalSelecionado = base.reduce(
    (s, d) => s + Number(d.Quantidade || 0), 0
  );

  const totalMes = dados.reduce(
    (s, d) => s + Number(d.Quantidade || 0), 0
  );

  document.getElementById("kpi-selecionado").textContent =
    totalSelecionado.toLocaleString("pt-BR");

  document.getElementById("kpi-mes").textContent =
    totalMes.toLocaleString("pt-BR");
}

/*************************************************
 * GRÁFICO
 *************************************************/
function atualizarGrafico() {
  const labels = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  const base = aplicarFiltros();

  base.forEach(d => {
    const dia = extrairDia(d.Data);
    if (dia) valores[dia - 1] += Number(d.Quantidade || 0);
  });

  if (chart) chart.destroy();

  const canvas = document.getElementById("graficoDiario");

  chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: "rgba(0,0,0,0)",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      animation: false,
      layout: { padding: { top: 30 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#e5e7eb" } },
        y: { display: false }
      }
    },
    plugins: [{
      id: "gradienteAzulPreto",
      beforeDatasetsDraw(chart) {
        const ctx = chart.ctx;
        chart.getDatasetMeta(0).data.forEach(bar => {
          const g = ctx.createLinearGradient(0, bar.base, 0, bar.y);
          g.addColorStop(0, "#020617");
          g.addColorStop(1, "#38bdf8");

          ctx.fillStyle = g;
          ctx.fillRect(
            bar.x - bar.width / 2,
            bar.y,
            bar.width,
            bar.base - bar.y
          );
        });
      }
    }]
  });

  atualizarFaixaSemanas(base);
}

/*************************************************
 * FAIXA DE SEMANAS
 *************************************************/
function atualizarFaixaSemanas(base) {
  const div = document.getElementById("faixa-semanas");
  if (!div) return;
  div.innerHTML = "";

  const semanas = {};

  base.forEach(d => {
    const dia = extrairDia(d.Data);
    if (!dia) return;

    let semana = null;
    Object.keys(d).forEach(k => {
      if (k.toLowerCase().includes("semana")) semana = d[k];
    });
    if (!semana) return;

    if (!semanas[semana]) semanas[semana] = [];
    semanas[semana].push(dia);
  });

  Object.entries(semanas).forEach(([sem, dias]) => {
    const s = document.createElement("div");
    s.style.gridColumn = `${Math.min(...dias)} / ${Math.max(...dias) + 1}`;
    s.textContent = sem;
    div.appendChild(s);
  });
}

/*************************************************
 * RESUMO SEMANAL
 *************************************************/
function atualizarResumoSemanal() {
  const container = document.getElementById("resumo-semanal");
  container.innerHTML = "";

  const base = aplicarFiltros();
  const totalMes = base.reduce(
    (s, d) => s + Number(d.Quantidade || 0), 0
  );

  const porSemana = {};

  base.forEach(d => {
    let semana = null;
    Object.keys(d).forEach(k => {
      if (k.toLowerCase().includes("semana")) semana = d[k];
    });
    if (!semana) return;

    porSemana[semana] =
      (porSemana[semana] || 0) + Number(d.Quantidade || 0);
  });

  Object.keys(porSemana).sort().forEach(sem => {
    const total = porSemana[sem];
    const perc = totalMes > 0 ? Math.round((total / totalMes) * 100) : 0;

    const div = document.createElement("div");
    div.className = "sem-box";
    div.innerHTML = `
      <span>${sem}</span>
      <span>${total.toLocaleString("pt-BR")}</span>
      <span class="percentual">${perc}%</span>
    `;
    container.appendChild(div);
  });
}

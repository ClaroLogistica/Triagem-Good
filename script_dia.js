/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;

/* Filtros */
let filtroTipo = null;
let filtroGiro = [];
let filtroDep = [];
let filtroTecnologias = [];
let filtroLocais = [];

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
 * CARREGAR EXCEL
 *************************************************/
fetch("Dados.xlsx")
  .then(r => r.arrayBuffer())
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);

    atualizarTudo();
  });

/*************************************************
 * FILTRO CENTRAL (temporariamente simples)
 *************************************************/
function aplicarFiltros() {
  return dados;
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

  document.getElementById("kpi-selecionado").textContent =
    base.reduce((s, d) => s + Number(d.Quantidade || 0), 0).toLocaleString("pt-BR");

  document.getElementById("kpi-mes").textContent =
    dados.reduce((s, d) => s + Number(d.Quantidade || 0), 0).toLocaleString("pt-BR");
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

  chart = new Chart(document.getElementById("graficoDiario"), {
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
      layout: { padding: { top: 28 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#e5e7eb" } },
        y: { display: false }
      }
    },
    plugins: [
      {
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
      },
      {
        id: "valoresTopo",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          ctx.fillStyle = "#e5e7eb";
          ctx.font = "11px Arial";
          ctx.textAlign = "center";

          chart.getDatasetMeta(0).data.forEach((bar, i) => {
            if (valores[i] > 0) {
              ctx.fillText(
                valores[i].toLocaleString("pt-BR"),
                bar.x,
                bar.y - 6
              );
            }
          });
        }
      }
    ]
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
    const el = document.createElement("div");
    el.style.gridColumn = `${Math.min(...dias)} / ${Math.max(...dias) + 1}`;
    el.textContent = sem;
    div.appendChild(el);
  });
}

/*************************************************
 * RESUMO SEMANAL
 *************************************************/
function atualizarResumoSemanal() {
  const container = document.getElementById("resumo-semanal");
  container.innerHTML = "";

  const base = aplicarFiltros();
  const totalMes = base.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

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

  Object.keys(porSemana).forEach(sem => {
    const total = porSemana[sem];
    const perc = totalMes ? Math.round((total / totalMes) * 100) : 0;
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
/*************************************************
 * ABERTURA / FECHAMENTO DE MODAIS (SIMPLES)
 *************************************************/

// Botão Local
const btnLocal = document.getElementById("btn-local");
const modalLocal = document.getElementById("modal-local");

if (btnLocal && modalLocal) {
  btnLocal.onclick = () => {
    modalLocal.style.display = "block";
  };
  modalLocal.onclick = e => {
    if (e.target === modalLocal) modalLocal.style.display = "none";
  };
}

// Botão Filtros
const btnFiltros = document.getElementById("btn-filtros");
const modalFiltros = document.getElementById("modal-filtros");

if (btnFiltros && modalFiltros) {
  btnFiltros.onclick = () => {
    modalFiltros.style.display = "block";
  };
  modalFiltros.onclick = e => {
    if (e.target === modalFiltros) modalFiltros.style.display = "none";
  };
}

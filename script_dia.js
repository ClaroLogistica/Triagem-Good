/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;

/* Filtros */
let filtroTipo = null;          // "Terminais" ou "Acessórios"
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

    configurarModalFiltros();
    configurarModalLocal();

    atualizarTudo();
  });

/*************************************************
 * MODAL LOCAL
 *************************************************/
function configurarModalLocal() {
  const modal = document.getElementById("modal-local");
  const btn = document.getElementById("btn-local");
  const lista = document.getElementById("lista-local");
  const btnAplicar = document.getElementById("btn-aplicar-local");

  btn.onclick = () => modal.style.display = "block";
  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  const locais = [...new Set(dados.map(d => d.Local).filter(Boolean))];
  lista.innerHTML = "";

  locais.forEach(l => {
    const label = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = l;

    chk.onchange = () => {
      filtroLocais = [...lista.querySelectorAll("input:checked")]
        .map(c => c.value);
    };

    label.appendChild(chk);
    label.append(" " + l);
    lista.appendChild(label);
  });

  btnAplicar.onclick = () => {
    modal.style.display = "none";
    atualizarTudo();
  };
}

/*************************************************
 * MODAL FILTROS
 *************************************************/
function configurarModalFiltros() {
  const modal = document.getElementById("modal-filtros");
  const btn = document.getElementById("btn-filtros");
  const btnAplicar = document.getElementById("btn-aplicar");
  const btnLimpar = document.getElementById("btn-limpar");

  btn.onclick = () => modal.style.display = "block";
  window.addEventListener("click", e => {
    if (e.target === modal) modal.style.display = "none";
  });

  document.querySelectorAll("input[name='tipo']").forEach(r => {
    r.onchange = () => {
      filtroTipo = r.value;
      montarTecnologias();
    };
  });

  document.querySelectorAll(".chk-giro,.chk-dep").forEach(c => {
    c.onchange = () => montarTecnologias();
  });

  btnAplicar.onclick = () => {
    filtroGiro = [...document.querySelectorAll(".chk-giro:checked")]
      .map(c => c.value);
    filtroDep = [...document.querySelectorAll(".chk-dep:checked")]
      .map(c => c.value);

    modal.style.display = "none";
    atualizarTudo();
  };

  btnLimpar.onclick = () => {
    filtroTipo = null;
    filtroGiro = [];
    filtroDep = [];
    filtroTecnologias = [];

    document.querySelectorAll("#modal-filtros input")
      .forEach(i => i.checked = false);
    document.getElementById("lista-tecnologia").innerHTML = "";

    atualizarTudo();
  };
}

/*************************************************
 * TECNOLOGIAS (DINÂMICO)
 *************************************************/
function montarTecnologias() {
  const div = document.getElementById("lista-tecnologia");
  div.innerHTML = "";
  filtroTecnologias = [];

  if (!filtroTipo) return;

  const base = dados
    .filter(d => {
      if (filtroTipo === "Terminais")
        return d["Terminais"] && (!d["Acessórios"] || d["Acessórios"].toString().trim() === "");
      if (filtroTipo === "Acessórios")
        return d["Acessórios"] && (!d["Terminais"] || d["Terminais"].toString().trim() === "");
      return false;
    })
    .filter(d => filtroGiro.length === 0 || filtroGiro.includes(d.Giro))
    .filter(d => filtroDep.length === 0 || filtroDep.includes(d["Dep."]));

  const tecnologias = [...new Set(
    base
      .map(d => d[filtroTipo])
      .filter(v => v && v.toString().trim() !== "")
  )];

  tecnologias.forEach(t => {
    const label = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = t;

    chk.onchange = () => {
      filtroTecnologias =
        [...div.querySelectorAll("input:checked")]
          .map(c => c.value);
    };

    label.appendChild(chk);
    label.append(" " + t);
    div.appendChild(label);
  });
}

/*************************************************
 * FILTRO CENTRAL
 *************************************************/
function aplicarFiltros() {
  return dados
    .filter(d => filtroLocais.length === 0 || filtroLocais.includes(d.Local))
    .filter(d => !filtroTipo || d[filtroTipo])
    .filter(d => filtroGiro.length === 0 || filtroGiro.includes(d.Giro))
    .filter(d => filtroDep.length === 0 || filtroDep.includes(d["Dep."]))
    .filter(d => filtroTecnologias.length === 0 ||
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

  aplicarFiltros().forEach(d => {
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
    layout: {
      padding: {
        top: 28   // suficiente para os valores
      }
    },
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
        const { ctx } = chart;
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
        const { ctx } = chart;
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

  Object.entries(porSemana).forEach(([sem, total]) => {
    const div = document.createElement("div");
    div.className = "sem-box";
    div.innerHTML = `
      <span>${sem}</span>
      <span>${total.toLocaleString("pt-BR")}</span>
      <span class="percentual">
        ${totalMes ? Math.round((total / totalMes) * 100) : 0}%
      </span>
    `;
    container.appendChild(div);
  });
}

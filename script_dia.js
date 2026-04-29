/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;

let localSelecionado = null;
let terminaisSelecionados = [];
let acessoriosSelecionados = [];

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

    criarSelectLocal();
    criarMultiselectTerminais();
    criarMultiselectAcessorios();

    atualizarTudo();
  });

/*************************************************
 * FILTROS — LOCAL
 *************************************************/
function criarSelectLocal() {
  const select = document.getElementById("select-local");
  select.innerHTML = "";

  select.appendChild(new Option("Todos", ""));

  [...new Set(dados.map(d => d["Local"]).filter(Boolean))]
    .forEach(l => select.appendChild(new Option(l, l)));

  select.onchange = () => {
    localSelecionado = select.value || null;
    atualizarTudo();
  };
}

/*************************************************
 * FILTROS — TERMINAIS (SEM ACESSÓRIOS)
 *************************************************/

function obterTerminaisValidos() {
  return [...new Set(
    dados
      .filter(d => !d["Acessórios"] || d["Acessórios"].toString().trim() === "")
      .map(d => d["Terminais"])
      .filter(v => v && v.toString().trim() !== "")
  )];
}


function criarMultiselectTerminais() {
  const lista = document.getElementById("lista-terminais");
  const btn = document.getElementById("btn-terminais");
  lista.innerHTML = "";

  obterTerminaisValidos().forEach(t => {
    const label = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = t;

    chk.onchange = () => {
      terminaisSelecionados =
        [...lista.querySelectorAll("input:checked")].map(c => c.value);
      atualizarTudo();
    };

    label.appendChild(chk);
    label.append(" " + t);
    lista.appendChild(label);
  });

  btn.onclick = () => {
    lista.style.display =
      lista.style.display === "block" ? "none" : "block";
  };
}

/*************************************************
 * FILTROS — ACESSÓRIOS (SEM TERMINAIS)
 *************************************************/
function obterAcessoriosValidos() {
  return [...new Set(
    dados
      .filter(d => !d["Terminais"] || d["Terminais"].toString().trim() === "")
      .map(d => d["Acessórios"])
      .filter(v => v && v.toString().trim() !== "")
  )];
}
function criarMultiselectAcessorios() {
  const lista = document.getElementById("lista-acessorios");
  const btn = document.getElementById("btn-acessorios");
  lista.innerHTML = "";

  obterAcessoriosValidos().forEach(a => {
    const label = document.createElement("label");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.value = a;

    chk.onchange = () => {
      acessoriosSelecionados =
        [...lista.querySelectorAll("input:checked")].map(c => c.value);
      atualizarTudo();
    };

    label.appendChild(chk);
    label.append(" " + a);
    lista.appendChild(label);
  });

  btn.onclick = () => {
    lista.style.display =
      lista.style.display === "block" ? "none" : "block";
  };
}

/*************************************************
 * FUNÇÃO CENTRAL DE ATUALIZAÇÃO
 *************************************************/
function atualizarTudo() {
  atualizarKPIs();
  atualizarGrafico();
  atualizarResumoSemanal();
}

/*************************************************
 * KPIs
 *************************************************/
function aplicarFiltros() {
  return dados
    .filter(d => !localSelecionado || d["Local"] === localSelecionado)
    .filter(d =>
      terminaisSelecionados.length === 0 ||
      terminaisSelecionados.includes(d["Terminais"])
    )
    .filter(d =>
      acessoriosSelecionados.length === 0 ||
      acessoriosSelecionados.includes(d["Acessórios"])
    );
}

function atualizarKPIs() {
  const base = aplicarFiltros();

  const totalSelecionado =
    base.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  const totalMes =
    dados.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  document.getElementById("kpi-selecionado")
    .textContent = totalSelecionado.toLocaleString("pt-BR");

  document.getElementById("kpi-mes")
    .textContent = totalMes.toLocaleString("pt-BR");
}

/*************************************************
 * GRÁFICO
 *************************************************/
function atualizarGrafico() {
  const labels = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  const dadosFiltrados = aplicarFiltros();

  dadosFiltrados.forEach(d => {
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

  atualizarFaixaSemanas(dadosFiltrados);
}

/*************************************************
 * FAIXA DE SEMANAS (ABAIXO DO GRÁFICO)
 *************************************************/
function atualizarFaixaSemanas(dadosFiltrados) {
  const div = document.getElementById("faixa-semanas");
  if (!div) return;
  div.innerHTML = "";

  const semanas = {};

  dadosFiltrados.forEach(d => {
    const dia = extrairDia(d.Data);
    if (!dia) return;

    let semana = null;
    Object.keys(d).forEach(k => {
      if (k.toLowerCase().includes("semana")) {
        semana = d[k];
      }
    });

    if (!semana) return;

    if (!semanas[semana]) semanas[semana] = [];
    semanas[semana].push(dia);
  });

  Object.entries(semanas).forEach(([semana, dias]) => {
    const span = document.createElement("div");
    span.style.gridColumn =
      `${Math.min(...dias)} / ${Math.max(...dias) + 1}`;
    span.textContent = semana;
    div.appendChild(span);
  });
}

/*************************************************
 * RESUMO SEMANAL
 *************************************************/
function atualizarResumoSemanal() {
  const container = document.getElementById("resumo-semanal");
  container.innerHTML = "";

  const base = aplicarFiltros();

  const totalMes =
    base.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  const porSemana = {};

  base.forEach(d => {
    let semanaValor = null;
    Object.keys(d).forEach(k => {
      if (k.toLowerCase().includes("semana")) {
        semanaValor = d[k];
      }
    });
    if (!semanaValor) return;

    porSemana[semanaValor] =
      (porSemana[semanaValor] || 0) + Number(d.Quantidade || 0);
  });

  Object.keys(porSemana).sort().forEach(sem => {
    const total = porSemana[sem];
    const perc =
      totalMes > 0 ? Math.round((total / totalMes) * 100) : 0;

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

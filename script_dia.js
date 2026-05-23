/*************************************************
 * VARIÁVEIS GLOBAIS
 *************************************************/
let dados = [];
let chart = null;

const mapaLocais = {
  "CITR CAMPINAS": "Lab. Campinas - HFC",
  "CITR RIO DE JANEIRO": "Lab. Rio de Janeiro - HFC",
  "CITR BRASÍLIA": "Lab. Brasília - HFC",
  "CITR MANAUS": "Lab. Jaboatão - HFC"
};

let filtroTipo = null;
let filtroGiro = [];
let filtroDep = [];
let filtroTecnologias = [];
let filtroLocais = [];
let filtroSemanaSelecionada = null;

/*************************************************
 * UTIL
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
 * CARREGA EXCEL
 *************************************************/
fetch(new URL("Dados.xlsx", window.location.href))
  .then(r => {
    if (!r.ok) throw new Error("Erro ao carregar Dados.xlsx");
    return r.arrayBuffer();
  })
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);
    console.log(" Excel carregado:", dados.length);
    atualizarTudo();
  })
  .catch(err => console.error(err));

/*************************************************
 * FILTRO CENTRAL
 *************************************************/
function aplicarFiltros() {
  let base = [...dados];

  if (filtroLocais.length > 0) {
    base = base.filter(d =>
      filtroLocais.some(f => d.Local && d.Local.includes(f))
    );
  }

  if (filtroTipo && filtroTecnologias.length > 0) {
    base = base.filter(d => filtroTecnologias.includes(d[filtroTipo]));
  }

  if (filtroSemanaSelecionada) {
    base = base.filter(d => {
      let s = Object.keys(d).find(k => k.toLowerCase().includes("semana"));
      return s && d[s] && d[s].includes(filtroSemanaSelecionada);
    });
  }

  if (filtroGiro.length > 0) {
    base = base.filter(d => filtroGiro.includes(d.Giro));
  }

  if (filtroDep.length > 0) {
    base = base.filter(d => filtroDep.includes(d["Dep."]));
  }

  return base;
}

/*************************************************
 * ATUALIZAÇÃO GERAL
 *************************************************/
function atualizarTudo() {
  if (!dados.length) return;

  console.log("📦 Total de dados:", dados.length);

  const base = aplicarFiltros();
  console.log("🎯 Base após filtros:", base.length);

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

  const ctx = document.getElementById("graficoDiario").getContext("2d");

  chart = new Chart(ctx, {
    type: "bar",

    data: {
      labels: labels,
      datasets: [{
        data: valores,
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.7,

        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;

          if (!chartArea) return "#2aa5a5";

          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );

          gradient.addColorStop(0, "#7be7e7");
          gradient.addColorStop(1, "#0a3f4a");

          return gradient;
        }
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { display: false }
      },

      scales: {
        x: {
          grid: {
            color: (context) => {
              const index = context.index;

              if ([4, 11, 18, 25].includes(index)) {
                return "rgba(255,255,255,0.3)";
              }

              return "rgba(255,255,255,0.05)";
            }
          },
          ticks: {
            color: "#ddd"
          }
        },

        y: {
          display: false
        }
      }
    }
  })

  atualizarFaixaSemanas(base);  //chamada correta fora do chart
}
 /*************************************************
 * SEMANAS
 *************************************************/
 function atualizarFaixaSemanas(base) {

  const div = document.getElementById("faixa-semanas");
  div.innerHTML = "";

  const map = {};

  base.forEach(d => {

    const dia = extrairDia(d.Data);

    const semKey = Object.keys(d).find(k =>
      k.toLowerCase().includes("semana")
    );

    if (dia && semKey) {
      if (!map[d[semKey]]) map[d[semKey]] = [];
      map[d[semKey]].push(dia);
    }

  });

  Object.entries(map).forEach(([semana, dias]) => {

    const el = document.createElement("div");

    const inicio = Math.min(...dias);
    const fim = Math.max(...dias);

    el.style.gridColumn = `${inicio} / ${fim + 1}`;
    el.textContent = semana;

    div.appendChild(el);
  });

  console.log("Semanas detectadas:", map);
}
/*************************************************
 * RESUMO
 *************************************************/
function atualizarResumoSemanal() {

  const base = aplicarFiltros();
  const total = base.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  const mapa = {
    "SEMANA 01": 0,
    "SEMANA 02": 0,
    "SEMANA 03": 0,
    "SEMANA 04": 0,
    "SEMANA 05": 0
  };

  base.forEach(d => {
    const chave = Object.keys(d).find(k => k.toLowerCase().includes("semana"));
    if (!chave) return;

    const semana = d[chave];
    if (!mapa[semana]) mapa[semana] = 0;

    mapa[semana] += Number(d.Quantidade || 0);
  });

  //  preenche SOMENTE os campos existentes (não cria div nova!)
  Object.entries(mapa).forEach(([sem, valor], index) => {

    const qtd = document.getElementById(`sem${index+1}-qtd`);
    const perc = document.getElementById(`sem${index+1}-perc`);

    if (!qtd || !perc) return;

    qtd.textContent = valor.toLocaleString("pt-BR");
    perc.textContent = total
      ? Math.round((valor / total) * 100) + "%"
      : "0%";
  });
}
/*************************************************
 * MODAIS + FILTROS
 *************************************************/

document.querySelectorAll(".modal").forEach(m =>
  m.onclick = e => e.target === m && m.classList.remove("active")
);

document.querySelectorAll("input[name='tipo']").forEach(r =>
  r.onchange = () => { filtroTipo = r.value; montarTecnologias(); }
);

document.getElementById("btn-aplicar").onclick = () => {
  filtroGiro = [...document.querySelectorAll(".chk-giro:checked")].map(c => c.value);
  filtroDep = [...document.querySelectorAll(".chk-dep:checked")].map(c => c.value);
  atualizarTudo();
  document.getElementById("modal-filtros").classList.remove("active");
};

document.getElementById("btn-limpar").onclick = () => {
  filtroTipo = null;
  filtroGiro = [];
  filtroDep = [];
  filtroTecnologias = [];

  document.querySelectorAll("#modal-filtros input").forEach(i => i.checked = false);
  document.getElementById("lista-tecnologia").innerHTML = "";

  atualizarTudo();
};


/*************************************************
 * LISTAS
 *************************************************/
function montarLocais() {
  const l = document.getElementById("lista-local");
  l.innerHTML = "";

  [...new Set(dados.map(d => d.Local).filter(Boolean))]
    .forEach(v => {
      const label = document.createElement("label");

      const c = document.createElement("input");
      c.type = "checkbox";
      c.value = v;

      c.onchange = () => {
        filtroLocais = [...l.querySelectorAll("input:checked")]
          .map(x => x.value);
      };

      label.appendChild(c);
      label.append(" " + v);

      l.appendChild(label);
    });
}
/*************************************************
 * MONTAR TECNOLOGIA
 *************************************************/

function montarTecnologias() {
  const l = document.getElementById("lista-tecnologia");
  l.innerHTML = "";
  if (!filtroTipo) return;

  [...new Set(dados.filter(d => d[filtroTipo]).map(d => d[filtroTipo]))]
    .forEach(v => {
      const label = document.createElement("label");

      const c = document.createElement("input");
      c.type = "checkbox";
      c.value = v;

      c.onchange = () => {
        filtroTecnologias = [...l.querySelectorAll("input:checked")]
          .map(x => x.value);
      };

      label.appendChild(c);
      label.append(" " + v);

      l.appendChild(label);
    });
}

const semanasSelecionadas = [];

function filtrarSemana(semana) {
  const btns = document.querySelectorAll(".botoes-semana .btn-padrao");

  btns.forEach(b => {
    if (b.textContent.includes(semana.replace("SEMANA ", "Sem "))) {
      b.classList.toggle("ativo");
    }
  });

  const ativos = document.querySelectorAll(".botoes-semana .btn-padrao.ativo");

  const container = document.querySelector(".botoes-semana");

  if (ativos.length > 0) {
    container.classList.add("has-selection");
  } else {
    container.classList.remove("has-selection");
  }

  // aqui você mantém sua lógica de filtro
  atualizarTudo();
}

function abrirFiltros() {
  document.getElementById("modal-filtros").classList.add("active");
}
function toggleLocal(el, botao) {
  const valorReal = mapaLocais[botao];
  if (!valorReal) return;

  const index = filtroLocais.indexOf(valorReal);

  if (index > -1) {
    filtroLocais.splice(index, 1);
    el.classList.remove("ativo");
  } else {
    filtroLocais.push(valorReal);
    el.classList.add("ativo");
  }

  const grupo = document.querySelector(".grupo-locais");

  if (filtroLocais.length > 0) {
    grupo.classList.add("has-selection");
  } else {
    grupo.classList.remove("has-selection");
  }

  atualizarTudo();
}

  //  verifica se já está selecionado
  const index = filtroLocais.indexOf(valorReal);

  if (index > -1) {
    // REMOVE
    filtroLocais.splice(index, 1);
    el.classList.remove("ativo");
  } else {
    // ADICIONA
    filtroLocais.push(valorReal);
    el.classList.add("ativo");
  }

  atualizarTudo()

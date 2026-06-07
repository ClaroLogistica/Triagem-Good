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
let semanasSelecionadas = [];

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
    atualizarEstadoBotoesSemana();
  })
  .catch(err => console.error(err));

/*************************************************
 * FILTRO CENTRAL
 *************************************************/
function aplicarFiltros() {
  let base = [...dados];

  // filtro CITR / Local
  if (filtroLocais.length > 0) {
    base = base.filter(d => filtroLocais.includes(d.Local));
  }

  // filtro semana (independente dos outros filtros)
  if (semanasSelecionadas.length > 0) {
    const semanaKey = Object.keys(base[0] || {}).find(k =>
      k.toLowerCase().includes("semana")
    );

    if (semanaKey) {
      base = base.filter(d =>
        semanasSelecionadas.includes(String(d[semanaKey]).toUpperCase().trim())
      );
    }
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

  const canvas = document.getElementById("graficoDiario");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  /* plugin interno para escrever o valor em cima da barra */
  const pluginLabelsTopo = {
    id: "labelsTopo",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      meta.data.forEach((bar, i) => {
        const valor = valores[i];
        if (!valor) return;

        ctx.fillText(
          valor.toLocaleString("pt-BR"),
          bar.x,
          bar.y - 6
        );
      });

      ctx.restore();
    }
  };

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        borderRadius: 0,
        borderSkipped: false,
        barThickness: 28,
        maxBarThickness: 30,
        categoryPercentage: 0.8,
        barPercentage: 0.95,

        /* degradê por coluna, sem erro de NaN */
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea, scales } = chart;

          if (!chartArea || !scales || !scales.y) {
            return "#2aa5a5";
          }

          const valor = Number(context.raw || 0);

          const yTop = scales.y.getPixelForValue(valor);
          const yBottom = scales.y.getPixelForValue(0);

          if (!Number.isFinite(yTop) || !Number.isFinite(yBottom)) {
            return "#2aa5a5";
          }

          const gradient = ctx.createLinearGradient(
            0,
            yBottom,
            0,
            yTop
          );

          gradient.addColorStop(0, "#0b4f69");  /* base escura */
          gradient.addColorStop(0.55, "#177b9f");
          gradient.addColorStop(1, "#7ef2f2");  /* topo claro */

          return gradient;
        }
      }],   // ✅ TEM QUE FECHAR AQUI
   },   // ✅ FECHAMENTO DO DATA (ESSENCIAL)

  
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,

      layout: {
        padding: {
          top: 28,   /* espaço para os números em cima */
          left: 8,
          right: 8,
          bottom: 0
        }
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (ctx) => ctx.raw.toLocaleString("pt-BR")
          }
        }
      },

      scales: {
        x: {
          offset: true,
            grid: {
              color: "rgba(255,255,255,0.06)",
              lineWidth: 0.5
            }
          },
          ticks: {
            color: "#e5e7eb",
            font: {
              size: 12
            },
            padding: 6
          }
        },

        y: {
          display: false,
          beginAtZero: true
        }
      }
    },

    plugins: [pluginLabelsTopo]
  });

  atualizarFaixaSemanas(base);
}
 /*************************************************
 * SEMANAS
 *************************************************/
function atualizarFaixaSemanas(base) {
  const div = document.getElementById("faixa-semanas");
  if (!div) return;

  div.innerHTML = "";

  const mapa = {};

  base.forEach(d => {
    const dia = extrairDia(d.Data);
    const semKey = Object.keys(d).find(k =>
      k.toLowerCase().includes("semana")
    );

    if (dia && semKey) {
      const semana = String(d[semKey]).trim();
      if (!mapa[semana]) mapa[semana] = [];
      mapa[semana].push(dia);
    }
  });

  const semanasOrdenadas = Object.entries(mapa)
    .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]));

  semanasOrdenadas.forEach(([semana, dias], index) => {
    const el = document.createElement("div");
    el.className = "faixa-semana-item";
    if (index === 0) el.classList.add("primeira");

    const inicio = Math.min(...dias);
    const fim = Math.max(...dias);

    el.style.gridColumn = `${inicio} / ${fim + 1}`;
    el.textContent = semana.replace("SEMANA", "Sem");

    div.appendChild(el);
  });
}
/*************************************************
 * RESUMO
 *************************************************/
function atualizarResumoSemanal() {
  const base = aplicarFiltros();
  const total = base.reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  if (!base.length) return;

  // descobre a coluna de semana no Excel
  const semanaKey = Object.keys(base[0]).find(k =>
    k.toLowerCase().includes("semana")
  );

  if (!semanaKey) return;

  const mapa = {};

  base.forEach(d => {
    const semana = String(d[semanaKey]).toUpperCase().trim();
    if (!mapa[semana]) mapa[semana] = 0;

    mapa[semana] += Number(d.Quantidade || 0);
  });

  // ordem correta (pela sequência real)
  const semanasOrdenadas = Object.entries(mapa).sort();

  semanasOrdenadas.forEach(([sem, valor], index) => {
    const qtd = document.getElementById(`sem${index + 1}-qtd`);
    const perc = document.getElementById(`sem${index + 1}-perc`);

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

/* mantém o visual dos botões da semana */
function atualizarEstadoBotoesSemana() {
  const botoes = document.querySelectorAll(".botoes-semana .btn-padrao");
  const container = document.querySelector(".botoes-semana");

  botoes.forEach(btn => {
    const texto = btn.textContent.trim().toUpperCase();

    if (texto === "LIMPAR") return;

    const semanaBtn = texto.replace("SEM ", "SEMANA ");

    if (semanasSelecionadas.length === 0) {
      btn.classList.add("ativo");
    } else {
      btn.classList.toggle("ativo", semanasSelecionadas.includes(semanaBtn));
    }
  });

  if (semanasSelecionadas.length > 0) {
    container.classList.add("has-selection");
  } else {
    container.classList.remove("has-selection");
  }
}

/* clique na semana */
function filtrarSemana(semana) {
  semana = semana.toUpperCase().trim();

  if (semanasSelecionadas.length === 0) {
    semanasSelecionadas = [semana];
  } else if (semanasSelecionadas.includes(semana)) {
    semanasSelecionadas = semanasSelecionadas.filter(s => s !== semana);
  } else {
    semanasSelecionadas.push(semana);
  }

  atualizarEstadoBotoesSemana();
  atualizarTudo();
}

/* botão Limpar = volta ao início (todas as semanas) */
function limparFiltroSemana() {
  semanasSelecionadas = [];
  atualizarEstadoBotoesSemana();
  atualizarTudo();
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
  grupo.classList.toggle("has-selection", filtroLocais.length > 0);

  atualizarTudo();
}


function limparFiltroLocal() {
  filtroLocais = [];

  document.querySelectorAll(".grupo-locais .btn-padrao").forEach(btn => {
    btn.classList.remove("ativo");
  });

  const grupo = document.querySelector(".grupo-locais");
  grupo.classList.remove("has-selection");

  atualizarTudo();
}

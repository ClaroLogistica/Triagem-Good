let dados = [];
let chart = null;

let semanaAtiva = null;
let laboratorioAtivo = null;
let terminalAtivo = null;

/* ===== EXTRAI DIA ===== */
function extrairDia(data) {
  if (data instanceof Date) return data.getDate();

  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    return new Date(base.getTime() + data * 86400000).getDate();
  }

  const d = new Date(data);
  return isNaN(d) ? null : d.getDate();
}

/* ===== CARREGA EXCEL ===== */
fetch("Dados.xlsx")
  .then(r => r.arrayBuffer())
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);

    criarBotoesSemana();
    criarBotoesLocal();
    criarBotoesTerminais();

    semanaAtiva = obterSemanas()[0];
    atualizarGrafico();
  });

/* ===== DADOS ÚNICOS ===== */
function obterSemanas() {
  const possiveis = ["Semana", "SEMANA", "semana", "semana "];

  let coluna = null;
  for (const p of possiveis) {
    if (dados.some(d => d[p])) {
      coluna = p;
      break;
    }
  }

  if (!coluna) {
    console.warn("Coluna de Semana não encontrada no Excel");
    return [];
  }

  // guarda o nome correto para uso no filtro
  window.COLUNA_SEMANA = coluna;

  return [...new Set(dados.map(d => d[coluna]).filter(Boolean))];
}

function obterLocais() {
  return [...new Set(dados.map(d => d["Local"]).filter(Boolean))];
}

function obterTerminais() {
  return [...new Set(dados.map(d => d["Terminais"]).filter(Boolean))];
}

/* ===== BOTÕES ===== */
function criarBotoesSemana() {
  const div = document.getElementById("botoes-semana");
  div.innerHTML = "";

  obterSemanas().forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = s;
    if (i === 0) b.classList.add("ativo");

    b.onclick = () => {
      semanaAtiva = s;
      document.querySelectorAll("#botoes-semana button")
        .forEach(x => x.classList.remove("ativo"));
      b.classList.add("ativo");
      atualizarGrafico();
    };

    div.appendChild(b);
  });
}

function criarBotoesLocal() {
  const div = document.getElementById("botoes-lab");
  div.innerHTML = "";

  const todos = document.createElement("button");
  todos.textContent = "Todos";
  todos.classList.add("ativo");
  todos.onclick = () => {
    laboratorioAtivo = null;
    document.querySelectorAll("#botoes-lab button")
      .forEach(x => x.classList.remove("ativo"));
    todos.classList.add("ativo");
    atualizarGrafico();
  };
  div.appendChild(todos);

  obterLocais().forEach(l => {
    const b = document.createElement("button");
    b.textContent = l;
    b.onclick = () => {
      laboratorioAtivo = l;
      document.querySelectorAll("#botoes-lab button")
        .forEach(x => x.classList.remove("ativo"));
      b.classList.add("ativo");
      atualizarGrafico();
    };
    div.appendChild(b);
  });
}

function criarBotoesTerminais() {
  const div = document.getElementById("botoes-terminais");
  div.innerHTML = "";

  const todos = document.createElement("button");
  todos.textContent = "Todos";
  todos.classList.add("ativo");
  todos.onclick = () => {
    terminalAtivo = null;
    document.querySelectorAll("#botoes-terminais button")
      .forEach(x => x.classList.remove("ativo"));
    todos.classList.add("ativo");
    atualizarGrafico();
  };
  div.appendChild(todos);

  obterTerminais().forEach(t => {
    const b = document.createElement("button");
    b.textContent = t;
    b.onclick = () => {
      terminalAtivo = t;
      document.querySelectorAll("#botoes-terminais button")
        .forEach(x => x.classList.remove("ativo"));
      b.classList.add("ativo");
      atualizarGrafico();
    };
    div.appendChild(b);
  });
}

/* ===== GRÁFICO ===== */
function atualizarGrafico() {
  const labels = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  dados
    .filter(d => d["semana "] === semanaAtiva)
    .filter(d => !laboratorioAtivo || d["Local"] === laboratorioAtivo)
    .filter(d => !terminalAtivo || d["Terminais"] === terminalAtivo)
    .forEach(d => {
      const dia = extrairDia(d.Data);
      if (dia) valores[dia - 1] += Number(d.Quantidade || 0);
    });

  document.getElementById("kpi-selecionado").textContent =
    valores.reduce((a, b) => a + b, 0).toLocaleString("pt-BR");

  document.getElementById("kpi-mes").textContent =
    dados.reduce((s, d) => s + Number(d.Quantidade || 0), 0).toLocaleString("pt-BR");

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("graficoDiario"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Produção por Dia",
        data: valores,
        backgroundColor: "#38bdf8",
        barThickness: 12
      }]
    },
    options: {
      animation: false,
      scales: {
        x: { ticks: { color: "#e5e7eb" } },
        y: { beginAtZero: true, ticks: { color: "#e5e7eb" } }
      },
      plugins: { legend: { labels: { color: "#e5e7eb" } } }
    },
    plugins: [{
      id: "valoresTopo",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "11px Arial";
        ctx.textAlign = "center";

        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const v = chart.data.datasets[0].data[i];
          if (v > 0) ctx.fillText(v.toLocaleString("pt-BR"), bar.x, bar.y - 5);
        });

        ctx.restore();
      }
    }]
  });
}

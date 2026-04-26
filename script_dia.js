let dados = [];
let chart = null;

let semanaAtiva = null;
let localAtivo = null;
let terminalAtivo = null;

/* ===== EXTRAI DIA DA DATA ===== */
function extrairDia(data) {
  if (data instanceof Date) return data.getDate();

  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    return new Date(base.getTime() + data * 86400000).getDate();
  }

  const d = new Date(data);
  return isNaN(d) ? null : d.getDate();
}

/* ===== CARREGAR EXCEL ===== */
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

/* ===== LISTAS ===== */
function obterSemanas() {
  return [...new Set(dados.map(d => d["Semana"]).filter(Boolean))];
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
    localAtivo = null;
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
      localAtivo = l;
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
    .filter(d => d["Semana"] === semanaAtiva)
    .filter(d => !localAtivo || d["Local"] === localAtivo)
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
function atualizarResumoSemanal() {
  const container = document.getElementById("resumo-semanal");
  container.innerHTML = "";

  // Total do mês considerando filtros (menos semana)
  const dadosFiltrados = dados
    .filter(d => !localAtivo || d["Local"] === localAtivo)
    .filter(d => !terminalAtivo || d["Terminais"] === terminalAtivo);

  const totalMes = dadosFiltrados
    .reduce((s, d) => s + Number(d.Quantidade || 0), 0);

  // Agrupar por Semana (coluna do Excel)
  const porSemana = {};
  dadosFiltrados.forEach(d => {
    const sem = d["Semana"];
    if (!sem) return;
    porSemana[sem] = (porSemana[sem] || 0) + Number(d.Quantidade || 0);
  });

  Object.keys(porSemana).forEach(sem => {
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

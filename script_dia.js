let laboratorioAtivo = null;
let dados = [];
let chart;
let semanaAtiva = null;

function extrairDia(data) {
  if (data instanceof Date) return data.getDate();

  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    const d = new Date(base.getTime() + data * 86400000);
    return d.getDate();
  }

  const d = new Date(data);
  if (!isNaN(d)) return d.getDate();

  return null;
}

fetch("Dados.xlsx")
  .then(r => r.arrayBuffer())
  .then(b => {
    const wb = XLSX.read(b, { type: "array" });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);

    criarBotoesSemana();
    semanaAtiva = obterSemanas()[0];
    atualizar();
  });

function obterSemanas() {
  return [...new Set(dados.map(d => d["semana "]).filter(Boolean))];
}

function criarBotoesSemana() {
  const div = document.getElementById("botoes-semana");
  div.innerHTML = "";

  obterSemanas().forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = s;
    b.onclick = () => {
      semanaAtiva = s;
      document.querySelectorAll(".painel-botoes button").forEach(x => x.classList.remove("ativo"));
      b.classList.add("ativo");
      atualizar();
    };
    if (i === 0) b.classList.add("ativo");
    div.appendChild(b);
  });
}

function atualizar() {
  const labels = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  dados
    .filter(d => d["semana "] === semanaAtiva)
    .forEach(d => {
      const dia = extrairDia(d.Data);
      if (dia) valores[dia - 1] += Number(d.Quantidade || 0);
    });

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
      scales: {
        x: { ticks: { color: "#e5e7eb" } },
        y: { beginAtZero: true, ticks: { color: "#e5e7eb" } }
      },
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      }
    }
  });
}

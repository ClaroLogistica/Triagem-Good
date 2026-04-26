let dados = [];
let chart;
let semanaAtiva = null;

// ===== CARREGAR EXCEL =====
fetch("Dados.xlsx")
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sheet);

    criarBotoesSemana();
    semanaAtiva = obterSemanas()[0];
    atualizarGrafico();
  });

// ===== SEMANAS =====
function obterSemanas() {
  return [...new Set(dados.map(d => d["semana "]).filter(Boolean))];
}

// ===== BOTÕES =====
function criarBotoesSemana() {
  const container = document.getElementById("botoes-semana");
  container.innerHTML = "";

  obterSemanas().forEach((sem, i) => {
    const btn = document.createElement("button");
    btn.textContent = sem;
    btn.onclick = () => {
      semanaAtiva = sem;
      document.querySelectorAll(".painel-botoes button")
        .forEach(b => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      atualizarGrafico();
    };
    if (i === 0) btn.classList.add("ativo");
    container.appendChild(btn);
  });
}

// ===== GRÁFICO DIA A DIA =====
function atualizarGrafico() {
  const diasMes = Array.from({ length: 31 }, (_, i) => i + 1);
  const valores = Array(31).fill(0);

  dados
    .filter(d => d["semana "] === semanaAtiva)
    .forEach(d => {
      const dia = new Date(d.Data).getDate();
      valores[dia - 1] += Number(d.Quantidade || 0);
    });

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("graficoDiario"), {
    type: "bar",
    data: {
      labels: diasMes,
      datasets: [{
        label: "Produção Diária",
        data: valores,
        backgroundColor: "#38bdf8"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#e5e7eb" } },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: "#e5e7eb" },
          title: {
            display: true,
            text: "Dias do Mês",
            color: "#e5e7eb"
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#e5e7eb" },
          title: {
            display: true,
            text: "Quantidade Produzida",
            color: "#e5e7eb"
          }
        }
      }
    }
  });
}

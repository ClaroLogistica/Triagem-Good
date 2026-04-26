let dados = [];
let chart;
let semanaAtiva = null;

// ===== EXTRAIR DIA DA DATA (ROBUSTO) =====
function extrairDia(data) {

  // Caso 1: já é Date (SEU CASO)
  if (data instanceof Date) {
    return data.getDate();
  }

  // Caso 2: número serial do Excel
  if (typeof data === "number") {
    const base = new Date(1899, 11, 30);
    const d = new Date(base.getTime() + data * 86400000);
    return d.getDate();
  }

  // Caso 3: string
  const d = new Date(data);
  if (!isNaN(d)) {
    return d.getDate();
  }

  return null;
}

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

// ===== GRÁFICO DIA A DIA (1–31) =====
function atualizarGrafico() {

  const labels = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const valores = Array(31).fill(0);

  dados
    .filter(d => d["semana "] === semanaAtiva)
    .forEach(d => {
      const dia = extrairDia(d.Data);

      if (dia && dia >= 1 && dia <= 31) {
        valores[dia - 1] += Number(d.Quantidade || 0);
      }
    });

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("graficoDiario"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Produção por Dia",
        data: valores,
        backgroundColor: "#38bdf8"
      }]
    },
    options: {
      responsive: true,
      animation: false,
      scales: {
        x: {
          type: "category",
          ticks: { color: "#e5e7eb" },
          title: {
            display: true,
            text: "Dia do Mês",
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
      },
      plugins: {
        legend: {
          labels: { color: "#e5e7eb" }
        }
      }
    }
  });
}

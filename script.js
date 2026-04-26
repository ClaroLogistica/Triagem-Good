let dados = [];
let chartDiario;
let semanaAtiva = null;

// CARREGAR EXCEL
fetch('Dados.xlsx')
  .then(r => r.arrayBuffer())
  .then(b => {
    const wb = XLSX.read(b, { type: 'array' });
    const sh = wb.Sheets[wb.SheetNames[0]];
    dados = XLSX.utils.sheet_to_json(sh);

    criarBotoesSemana();
    semanaAtiva = obterSemanas()[0];
    atualizarGrafico();
  });

// IDENTIFICAR SEMANAS
function obterSemanas() {
  return [...new Set(dados.map(d => d['semana ']).filter(v => v))];
}

// CRIAR BOTÕES
function criarBotoesSemana() {
  const div = document.getElementById('botoes-semana');
  const semanas = obterSemanas();

  semanas.forEach(sem => {
    const btn = document.createElement('button');
    btn.textContent = sem;
    btn.onclick = () => {
      semanaAtiva = sem;
      document.querySelectorAll('.painel-botoes button').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      atualizarGrafico();
    };
    div.appendChild(btn);
  });

  // Ativar primeiro botão
  setTimeout(() => {
    div.querySelector('button')?.classList.add('ativo');
  }, 0);
}

// ATUALIZAR GRÁFICO DIÁRIO
function atualizarGrafico() {
  const filtrado = dados.filter(d => d['semana '] === semanaAtiva);

  // SOMAR POR DIA
  const porDia = {};
  filtrado.forEach(d => {
    const dia = new Date(d.Data).getDate();
    porDia[dia] = (porDia[dia] || 0) + Number(d.Quantidade || 0);
  });

  const labels = Object.keys(porDia).sort((a, b) => a - b);
  const valores = labels.map(d => porDia[d]);

  if (chartDiario) chartDiario.destroy();

  chartDiario = new Chart(document.getElementById('graficoDiario'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Produção por Dia',
        data: valores,
        backgroundColor: '#38bdf8'
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: '#e5e7eb' } }
      },
      scales: {
        x: { ticks: { color: '#e5e7eb' } },
        y: { ticks: { color: '#e5e7eb' }, beginAtZero: true }
      }
    }
  });
}

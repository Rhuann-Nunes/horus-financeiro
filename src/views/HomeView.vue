<template>
  <v-container fluid>
    <!-- New Cards Row -->
    <v-row>
      <v-col cols="12" sm="4">
        <v-card class="elevation-2" height="125">
          <v-card-text class="d-flex flex-column justify-center align-center h-100">
            <div class="text-h6 mb-2">Receitas Totais</div>
            <div class="text-h5" :class="receitasMes >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(receitasMes) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card class="elevation-2" height="125">
          <v-card-text class="d-flex flex-column justify-center align-center h-100">
            <div class="text-h6 mb-2">Despesas Totais</div>
            <div class="text-h5 text-error">
              {{ formatCurrency(despesasMes) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card class="elevation-2" height="125">
          <v-card-text class="d-flex flex-column justify-center align-center h-100">
            <div class="text-h6 mb-2">Saldo Total</div>
            <div class="text-h5" :class="saldoMes >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(saldoMes) }}
              <span class="text-error text-body-2">({{ formatCurrency(despesasFuturas) }})</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Existing Chart Row -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title class="text-h5">
            Visão Geral Financeira
          </v-card-title>
          <v-card-text>
            <div v-if="loading" class="d-flex justify-center align-center" style="height: 400px">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <div v-else-if="error" class="d-flex justify-center align-center" style="height: 400px">
              <v-alert type="error" class="ma-4">{{ error }}</v-alert>
            </div>
            <div v-else class="chart-container">
              <Bar
                v-if="chartData.labels.length > 0"
                :data="chartData"
                :options="chartOptions"
              />
              <div v-else class="d-flex justify-center align-center" style="height: 400px">
                <v-alert type="info" class="ma-4">Nenhum dado disponível para exibição</v-alert>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title class="text-h5">
            Despesas por Grupo
          </v-card-title>
          <v-card-text>
            <div v-if="loading" class="d-flex justify-center align-center" style="height: 400px">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <div v-else-if="error" class="d-flex justify-center align-center" style="height: 400px">
              <v-alert type="error" class="ma-4">{{ error }}</v-alert>
            </div>
            <div v-else class="chart-container">
              <Pie
                v-if="pieChartData.labels.length > 0"
                :data="pieChartData"
                :options="pieChartOptions"
              />
              <div v-else class="d-flex justify-center align-center" style="height: 400px">
                <v-alert type="info" class="ma-4">Nenhum dado disponível para exibição</v-alert>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="metas-card elevation-2">
          <v-card-title class="text-h5">
            Metas Financeiras
          </v-card-title>
          <v-card-text class="metas-container">
            <div v-if="loading" class="d-flex justify-center align-center">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <div v-else-if="error" class="d-flex justify-center align-center">
              <v-alert type="error" class="ma-4">{{ error }}</v-alert>
            </div>
            <div v-else>
              <v-data-table
                :headers="metasHeaders"
                :items="metasProcessadas"
                class="elevation-1"
              >
                <template #[`item.valor`]="{ item }">
                  {{ formatCurrency(item.valor) }}
                </template>
                <template #[`item.dataAlvo`]="{ item }">
                  {{ formatDate(item.dataAlvo) }}
                </template>
                <template #[`item.dataProjecao`]="{ item }">
                  {{ formatDate(item.dataProjecao) }}
                </template>
                <template #[`item.progresso`]="{ item }">
                  <v-progress-linear
                    :model-value="(item.valorAcumulado / item.valor) * 100"
                    height="20"
                    color="primary"
                  >
                    <template #default="{ value }">
                      <strong>{{ formatCurrency(item.valorAcumulado) }} ({{ Math.round(value) }}%)</strong>
                    </template>
                  </v-progress-linear>
                </template>
                <template #[`item.status`]="{ item }">
                  <v-chip
                    :color="item.status === 'No prazo' ? 'success' : 
                           item.status === 'Atrasada' ? 'error' : 'primary'"
                    text-color="white"
                    small
                  >
                    {{ item.status }}
                  </v-chip>
                </template>
              </v-data-table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="insights-card elevation-2">
          <v-card-title class="text-h5 d-flex align-center">
            <v-icon class="mr-2 ai-icon" size="32">mdi-brain</v-icon>
            Insights Hórus
          </v-card-title>
          <v-card-text>
            <div v-if="loading" class="d-flex justify-center align-center py-4">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <pre v-else class="text-body-1 white-space-pre-line">{{ relatorioConsolidado }}</pre>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Bar, Pie } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { supabase } from '@/utils/supabase'
import OpenAI from 'openai'

// Register ChartJS components correctly
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
)

const loading = ref(true)
const error = ref(null)
const chartData = ref({
  labels: [],
  datasets: [
    {
      label: 'Receitas',
      backgroundColor: '#4CAF50',
      data: [],
      type: 'bar',
      yAxisID: 'y'
    },
    {
      label: 'Despesas Pagas',
      backgroundColor: '#F44336',
      data: [],
      type: 'bar',
      yAxisID: 'y'
    },
    {
      label: 'Despesas Futuras',
      backgroundColor: '#FFC107',
      data: [],
      type: 'bar',
      yAxisID: 'y'
    },
    {
      label: 'Apuração',
      borderColor: '#2196F3',
      backgroundColor: '#2196F3',
      data: [],
      type: 'line',
      pointRadius: 4,
      fill: false,
      yAxisID: 'y1'
    }
  ]
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      beginAtZero: true,
      ticks: {
        display: true,
        font: {
          size: 10
        }
      },
      grid: {
        display: true
      }
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      beginAtZero: true,
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        display: true,
        font: {
          size: 10
        }
      }
    },
    x: {
      ticks: {
        font: {
          size: 10
        },
        maxRotation: 45,
        minRotation: 45
      }
    }
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 11
        },
        boxWidth: 12,
        padding: 8
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${formatCurrency(context.raw)}`
        }
      }
    }
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const despesasFuturas = ref(0)

const fetchFinancialData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (!userData?.selectedfinshare) {
      throw new Error('Nenhuma finshare selecionada')
    }

    // Fetch all receitas
    const { data: allReceitas } = await supabase
      .from('receitas')
      .select('valor')
      .eq('idfinshare', userData.selectedfinshare)

    // Fetch all paid despesas
    const { data: allDespesas } = await supabase
      .from('contaspagar')
      .select('valor')
      .eq('idfinshare', userData.selectedfinshare)
      .eq('status', 'Pago')

    // Fetch all future despesas
    const { data: allDespesasFuturas } = await supabase
      .from('contaspagar')
      .select('valor')
      .eq('idfinshare', userData.selectedfinshare)
      .eq('status', 'A pagar')

    // Calculate totals
    receitasMes.value = allReceitas?.reduce((sum, r) => sum + r.valor, 0) || 0
    despesasMes.value = allDespesas?.reduce((sum, d) => sum + d.valor, 0) || 0
    despesasFuturas.value = allDespesasFuturas?.reduce((sum, d) => sum + d.valor, 0) || 0

    // Fetch data for both charts
    await Promise.all([
      fetchExistingChartData(userData),
      fetchGrupoDespesas(userData)
    ])

    // Add this after your existing fetch calls
    const { data: metasData } = await supabase
      .from('metas')
      .select('*')
      .eq('idfinshare', userData.selectedfinshare)

    metas.value = metasData || []
    metasProcessadas.value = await calcularProjecoesMetas(metasData || [])
    
    // Adicione esta linha no final do try
    await gerarRelatorioConsolidado()
    
  } catch (err) {
    console.error('Error fetching financial data:', err)
    error.value = 'Erro ao carregar dados financeiros'
  } finally {
    loading.value = false
  }
}

const processMonthlyData = (receitas, despesas, startDate, endDate) => {
  const months = []
  const monthlyReceitas = []
  const monthlyDespesasPagas = []
  const monthlyDespesasFuturas = []
  const monthlyApuracao = []
  
  let currentDate = new Date(startDate)
  let accumulatedBalance = 0

  while (currentDate <= endDate) {
    const monthKey = currentDate.toISOString().substring(0, 7)
    months.push(formatMonthLabel(currentDate))

    // Calculate monthly totals
    const monthReceitas = receitas
      .filter(r => r.data.startsWith(monthKey))
      .reduce((sum, r) => sum + r.valor, 0)

    const monthDespesasPagas = despesas
      .filter(d => d.dataparcela.startsWith(monthKey) && d.status === 'Pago')
      .reduce((sum, d) => sum + d.valor, 0)

    const monthDespesasFuturas = despesas
      .filter(d => d.dataparcela.startsWith(monthKey) && d.status === 'A pagar')
      .reduce((sum, d) => sum + d.valor, 0)

    monthlyReceitas.push(monthReceitas)
    monthlyDespesasPagas.push(monthDespesasPagas)
    monthlyDespesasFuturas.push(monthDespesasFuturas)

    accumulatedBalance += monthReceitas - monthDespesasPagas - monthDespesasFuturas
    monthlyApuracao.push(accumulatedBalance)

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return {
    labels: months,
    receitas: monthlyReceitas,
    despesasPagas: monthlyDespesasPagas,
    despesasFuturas: monthlyDespesasFuturas,
    apuracao: monthlyApuracao
  }
}

const formatMonthLabel = (date) => {
  return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
}

const updateChartData = (monthlyData) => {
  chartData.value = {
    labels: monthlyData.labels,
    datasets: [
      {
        ...chartData.value.datasets[0],
        data: monthlyData.receitas
      },
      {
        ...chartData.value.datasets[1],
        data: monthlyData.despesasPagas
      },
      {
        ...chartData.value.datasets[2],
        data: monthlyData.despesasFuturas
      },
      {
        ...chartData.value.datasets[3],
        data: monthlyData.apuracao
      }
    ]
  }
}

// Add new pie chart data
const pieChartData = ref({
  labels: [],
  datasets: [{
    backgroundColor: [
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#FF6384',
      '#36A2EB',
      '#FFCE56',
      '#4BC0C0'
    ],
    data: []
  }]
})

const pieChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.raw || 0;
          const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
          const percentage = ((value * 100) / total).toFixed(1);
          return `${label}: ${formatCurrency(value)} (${percentage}%)`;
        }
      }
    },
    datalabels: {
      color: '#FFFFFF',
      font: {
        weight: 'bold',
        size: 13
      },
      formatter: (value, context) => {
        const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
        const percentage = ((value * 100) / total).toFixed(1);
        return `${percentage}%`;
      },
      anchor: 'center',
      align: 'center',
      offset: 0,
      textAlign: 'center',
      display: (context) => {
        const value = context.dataset.data[context.dataIndex];
        const maxValue = Math.max(...context.dataset.data);
        return value > (maxValue * 0.1);
      }
    }
  },
  layout: {
    padding: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    }
  }
}

// Add new function to fetch and process group expenses
const fetchGrupoDespesas = async (userData) => {
  try {
    // Buscar primeiro os grupos de despesa
    const { data: grupos, error: gruposError } = await supabase
      .from('grupodespesa')
      .select('id, grupodespesa')
      .eq('finshareid', userData.selectedfinshare)

    if (gruposError) throw gruposError
    
    console.log('Grupos encontrados:', grupos)

    // Buscar as despesas
    const { data: despesas, error: despesasError } = await supabase
      .from('contaspagar')
      .select('valor, idgrupodespesa')
      .eq('idfinshare', userData.selectedfinshare)

    if (despesasError) throw despesasError

    console.log('Despesas encontradas:', despesas)

    // Calcular totais por grupo
    const groupTotals = {}
    
    despesas.forEach(despesa => {
      const grupo = grupos.find(g => g.id === despesa.idgrupodespesa)
      if (grupo) {
        const groupName = grupo.grupodespesa
        groupTotals[groupName] = (groupTotals[groupName] || 0) + despesa.valor
      }
    })

    console.log('Totais por grupo:', groupTotals)

    const sortedEntries = Object.entries(groupTotals)
      .sort(([, a], [, b]) => b - a)

    if (sortedEntries.length > 0) {
      pieChartData.value = {
        labels: sortedEntries.map(([group]) => group),
        datasets: [{
          label: 'Total por Grupo',
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
          ],
          data: sortedEntries.map(([, total]) => total)
        }]
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  }
}

const fetchExistingChartData = async (userData) => {
  // Get date range from receitas
  const { data: receitasDates } = await supabase
    .from('receitas')
    .select('data')
    .eq('idfinshare', userData.selectedfinshare)
    .order('data', { ascending: true })

  // Get date range from contaspagar
  const { data: despesasDates } = await supabase
    .from('contaspagar')
    .select('dataparcela')
    .eq('idfinshare', userData.selectedfinshare)
    .order('dataparcela', { ascending: true })

  // Find earliest and latest dates
  const allDates = [
    ...(receitasDates?.map(r => new Date(r.data)) || []),
    ...(despesasDates?.map(d => new Date(d.dataparcela)) || [])
  ]

  if (allDates.length === 0) {
    chartData.value.labels = []
    return
  }

  const startDate = new Date(Math.min(...allDates))
  const endDate = new Date(Math.max(...allDates))

  // Fetch receitas within date range
  const { data: receitas } = await supabase
    .from('receitas')
    .select('valor, data')
    .eq('idfinshare', userData.selectedfinshare)
    .gte('data', startDate.toISOString())

  // Fetch despesas within date range
  const { data: despesas } = await supabase
    .from('contaspagar')
    .select('valor, dataparcela, status')
    .eq('idfinshare', userData.selectedfinshare)
    .gte('dataparcela', startDate.toISOString())
    .lte('dataparcela', endDate.toISOString())

  // Process data by month
  const monthlyData = processMonthlyData(receitas || [], despesas || [], startDate, endDate)
  updateChartData(monthlyData)
}

const receitasMes = ref(0)
const despesasMes = ref(0)
const saldoMes = computed(() => receitasMes.value - despesasMes.value)

// Add with other refs
const metasHeaders = [
  { title: 'Descrição', key: 'descricao' },
  { title: 'Valor', key: 'valor' },
  { title: 'Data Alvo', key: 'dataAlvo' },
  { title: 'Data Projeção', key: 'dataProjecao' },
  { title: 'Status', key: 'status' },
  { title: 'Progresso', key: 'progresso' }
]

const metas = ref([])
const metasProcessadas = ref([])

// Add new function to format dates
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR')
}

// Add new function to calculate projections
const calcularProjecoesMetas = async (metasData) => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    // Get last 6 months of financial data
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Fetch receitas
    const { data: receitas } = await supabase
      .from('receitas')
      .select('valor, data')
      .eq('idfinshare', userData.selectedfinshare)
      .gte('data', sixMonthsAgo.toISOString())

    // Fetch despesas
    const { data: despesas } = await supabase
      .from('contaspagar')
      .select('valor, dataparcela, status')
      .eq('idfinshare', userData.selectedfinshare)
      .gte('dataparcela', sixMonthsAgo.toISOString())

    // Calculate monthly averages
    const receitaMedia = receitas.reduce((sum, r) => sum + r.valor, 0) / 6
    const despesaMedia = despesas
      .filter(d => d.status === 'Pago')
      .reduce((sum, d) => sum + d.valor, 0) / 6

    // Calculate monthly savings capacity
    const capacidadePoupanca = receitaMedia - despesaMedia

    // Sort metas by target date
    const metasOrdenadas = [...metasData].sort((a, b) => 
      new Date(a.dataAlvo) - new Date(b.dataAlvo)
    )

    let mesAtual = new Date()
    let saldoDisponivel = 0

    return metasOrdenadas.map(meta => {
      const valorNecessario = meta.valor - (meta.valorAcumulado || 0)
      const mesesNecessarios = Math.ceil((valorNecessario - saldoDisponivel) / capacidadePoupanca)
      
      if (mesesNecessarios > 0) {
        saldoDisponivel = 0
      } else {
        saldoDisponivel = saldoDisponivel - valorNecessario
      }

      mesAtual.setMonth(mesAtual.getMonth() + Math.max(0, mesesNecessarios))
      
      // Corrige o problema da data alvo
      const [ano, mes, dia] = meta.dataalvo.split('-')
      const dataAlvoObj = new Date(ano, mes - 1, dia)
      const dataProjecaoObj = new Date(mesAtual)
      const diffEmDias = (dataProjecaoObj - dataAlvoObj) / (1000 * 60 * 60 * 24)
      const margemEmDias = Math.ceil(Math.abs(dataAlvoObj - new Date()) * 0.1 / (1000 * 60 * 60 * 24))
      
      let status
      if (Math.abs(diffEmDias) <= margemEmDias) {
        status = 'No prazo'
      } else if (diffEmDias > margemEmDias) {
        status = 'Atrasada'
      } else {
        status = 'Adiantada'
      }

      return {
        ...meta,
        dataAlvo: meta.dataalvo,
        dataProjecao: mesAtual.toISOString(),
        valorAcumulado: meta.valorAcumulado || 0,
        status
      }
    })
  } catch (error) {
    console.error('Erro ao calcular projeções:', error)
    return metasData
  }
}

const relatorioConsolidado = ref('')

const gerarRelatorioConsolidado = async () => {
  const dataAtual = new Date().toLocaleDateString('pt-BR')
  const receitasTotal = receitasMes.value
  const despesasTotal = despesasMes.value
  const saldoTotal = saldoMes.value
  
  // Análise do gráfico de pizza (Despesas por Grupo)
  const totalDespesas = pieChartData.value.datasets[0].data.reduce((a, b) => a + b, 0)
  const maioresDespesas = pieChartData.value.labels
    .map((label, index) => ({
      grupo: label,
      valor: pieChartData.value.datasets[0].data[index],
      percentual: (pieChartData.value.datasets[0].data[index] / totalDespesas * 100).toFixed(1)
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3)

  // Análise das metas
  const metasNoPrazo = metasProcessadas.value.filter(m => m.status === 'No prazo').length
  const metasAtrasadas = metasProcessadas.value.filter(m => m.status === 'Atrasada').length
  const metasAdiantadas = metasProcessadas.value.filter(m => m.status === 'Adiantada').length

  // Análise mensal
  const dadosMensais = chartData.value.labels.map((mes, index) => ({
    mes,
    receitas: chartData.value.datasets[0].data[index],
    despesasPagas: chartData.value.datasets[1].data[index],
    despesasFuturas: chartData.value.datasets[2].data[index],
    apuracao: chartData.value.datasets[3].data[index]
  }))

  relatorioConsolidado.value = `
RELATÓRIO FINANCEIRO CONSOLIDADO - ${dataAtual}

1. RESUMO GERAL
Receitas Totais: ${formatCurrency(receitasTotal)}
Despesas Totais: ${formatCurrency(despesasTotal)}
Saldo Total: ${formatCurrency(saldoTotal)}

2. ANÁLISE DE DESPESAS POR GRUPO
Total de Despesas: ${formatCurrency(totalDespesas)}
Principais Grupos:
${maioresDespesas.map(d => `- ${d.grupo}: ${formatCurrency(d.valor)} (${d.percentual}% do total)`).join('\n')}

3. STATUS DAS METAS FINANCEIRAS
Total de Metas: ${metasProcessadas.value.length}
- Metas no Prazo: ${metasNoPrazo}
- Metas Atrasadas: ${metasAtrasadas}
- Metas Adiantadas: ${metasAdiantadas}

4. ANÁLISE MENSAL
${dadosMensais.map(mes => `
${mes.mes}:
  Receitas: ${formatCurrency(mes.receitas)}
  Despesas Pagas: ${formatCurrency(mes.despesasPagas)}
  Despesas Futuras: ${formatCurrency(mes.despesasFuturas)}
  Apuração: ${formatCurrency(mes.apuracao)}
`).join('')}

5. RECOMENDAÇÕES
${saldoTotal >= 0 
  ? '✓ A situação financeira atual é positiva, com saldo favorável.'
  : '⚠ Atenção: Situação financeira atual apresenta déficit.'}
${metasAtrasadas > 0 
  ? `⚠ Existem ${metasAtrasadas} metas atrasadas que precisam de atenção.`
  : '✓ Todas as metas estão dentro do planejado ou adiantadas.'}
${dadosMensais[dadosMensais.length - 1].apuracao < 0 
  ? '⚠ A apuração do último mês está negativa, considere revisar o orçamento.'
  : '✓ A apuraão do último mês está positiva, continue com o bom trabalho.'}`

  try {
    const insights = await generateAIInsights(relatorioConsolidado.value)
    relatorioConsolidado.value = insights
  } catch (error) {
    console.error('Erro ao gerar insights:', error)
  }
}

const generateAIInsights = async (reportData) => {
  const openai = new OpenAI({
    apiKey: process.env.VUE_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um consultor financeiro especializado em análise de dados e planejamento financeiro pessoal. Forneça análises específicas e ações práticas baseadas nos dados apresentados.'
        },
        {
          role: 'user',
          content: `${reportData}

Analise os dados financeiros acima e forneça:

1. ANÁLISE DE FLUXO DE CAIXA
- Identifique padrões específicos de receitas e despesas
- Calcule e comente a taxa de poupança atual (receitas - despesas / receitas)
- Destaque meses críticos onde as despesas ultrapassaram as receitas

2. OTIMIZAÇÃO DE DESPESAS
- Analise os 3 maiores grupos de despesas e sugira açes específicas para redução
- Identifique possíveis despesas duplicadas ou desnecessárias
- Proponha um percentual ideal de redução para cada categoria principal

3. PLANEJAMENTO DE METAS
- Avalie a viabilidade das metas atuais considerando o fluxo de caixa
- Sugira ajustes específicos no orçamento para atingir as metas no prazo
- Proponha uma estratégia de priorização para metas atrasadas

4. RECOMENDAÇÕES ACIONÁVEIS
- Liste 3-5 ações específicas que podem ser implementadas nos próximos 30 dias
- Sugira ferramentas ou métodos para melhor controle financeiro
- Proponha metas de economia mensais com valores específicos

Formate a resposta de forma clara e direta, com números e percentuais específicos quando relevante.`
        }
      ],
      temperature: 0.5,
      max_tokens: 2500
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Erro ao gerar insights:', error)
    return 'Erro ao gerar insights. Por favor, tente novamente.'
  }
}

onMounted(() => {
  fetchFinancialData()
})
</script>

<style scoped>
.chart-container {
  height: 450px;
  position: relative;
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.v-card {
  height: 500px;
}

.mt-4 {
  margin-top: 1rem;
}

.text-success {
  color: #4CAF50 !important;
}

.text-error {
  color: #F44336 !important;
}

.h-100 {
  height: 100%;
}

.insights-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
  color: #fff;
  height: auto !important;
}

.insights-card .v-card-text {
  max-height: 600px;
  overflow-y: auto;
  padding: 1.5rem;
}

.insights-card pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
  max-width: 100%;
  padding: 1rem;
  line-height: 1.6;
  font-family: 'Roboto', sans-serif;
}

/* Estilização da barra de rolagem */
.insights-card .v-card-text::-webkit-scrollbar {
  width: 8px;
}

.insights-card .v-card-text::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.insights-card .v-card-text::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.insights-card .v-card-text::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

.ai-icon {
  background: linear-gradient(45deg, #00f2fe, #4facfe);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.insights-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    rgba(192, 192, 192, 0.1) 25%,
    transparent 50%
  );
  animation: rotate 4s linear infinite;
  pointer-events: none;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.white-space-pre-line {
  white-space: pre-line;
  padding: 1rem;
}

.metas-card {
  height: 250px !important;
}

.metas-card .v-card-text {
  height: calc(250px - 64px); /* altura total - altura do título */
  overflow-y: auto;
  padding: 0;
}

.metas-container {
  padding: 16px;
}

/* Estilização da barra de rolagem */
.metas-card .v-card-text::-webkit-scrollbar {
  width: 8px;
}

.metas-card .v-card-text::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.metas-card .v-card-text::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.metas-card .v-card-text::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Para telas menores que 600px */
@media (max-width: 600px) {
  .chart-container {
    height: 300px;
  }
  
  /* Ajusta o padding do container para telas pequenas */
  .v-container {
    padding: 8px !important;
  }
  
  /* Reduz o espaçamento entre linhas */
  .mt-4 {
    margin-top: 0.5rem !important;
  }
}

/* Para telas muito pequenas */
@media (max-width: 320px) {
  .chart-container {
    height: 250px;
  }
}
</style>




















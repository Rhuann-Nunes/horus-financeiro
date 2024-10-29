<template>
  <v-container fluid>
    <v-card class="elevation-2">
      <v-card-title class="text-h5">Relatórios</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedReport"
              :items="reportTypes"
              label="Tipo de Relatório"
              required
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="startDate"
              label="Data Inicial"
              type="date"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="endDate"
              label="Data Final"
              type="date"
              required
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" class="text-center">
            <v-btn
              color="primary"
              @click="generateReport"
              :loading="loading"
              :disabled="!isFormValid"
            >
              Gerar Relatório
            </v-btn>
          </v-col>
        </v-row>

        <!-- Preview Section -->
        <v-row v-if="reportData.length > 0">
          <v-col cols="12">
            <v-card class="mt-4">
              <v-card-title class="d-flex justify-space-between align-center">
                Pré-visualização
                <v-btn
                  color="success"
                  @click="exportToPDF"
                  :loading="exportingPDF"
                >
                  Exportar PDF
                </v-btn>
              </v-card-title>
              <v-card-text>
                <v-data-table
                  :headers="tableHeaders"
                  :items="reportData"
                  class="elevation-1"
                >
                  <template #item="{ item }">
                    <div class="report-page">
                      <div class="report-header">
                        <h2>Relatório de {{ getReportTitle() }}</h2>
                        <p class="report-date">Data de emissão: {{ new Date().toLocaleDateString('pt-BR') }}</p>
                      </div>
                      
                      <div class="report-content">
                        <div class="info-section">
                          <div class="info-row">
                            <strong>Valor:</strong>
                            <span>{{ item.valor }}</span>
                          </div>
                          
                          <div class="info-row">
                            <strong>Data do Pagamento:</strong>
                            <span>{{ item.datapagamento }}</span>
                          </div>
                        </div>

                        <div class="comprovante-section">
                          <h3>Comprovante</h3>
                          <div class="image-container">
                            <img 
                              v-if="item.comprovante" 
                              :src="item.comprovante" 
                              alt="Comprovante"
                              class="comprovante-image"
                            />
                            <span v-else class="no-image">Sem comprovante</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'
import html2pdf from 'html2pdf.js'

const reportTypes = [
  { title: 'Contas a Pagar', value: 'contas_pagar' },
  { title: 'Contas Pagas', value: 'contas_pagas' },
  { title: 'Pagamentos', value: 'pagamentos' }
]

const selectedReport = ref('')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const exportingPDF = ref(false)
const reportData = ref([])
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')

const tableHeaders = computed(() => {
  switch (selectedReport.value) {
    case 'contas_pagar':
    case 'contas_pagas':
      return [
        { title: 'Tipo de Despesa', key: 'tipodespesa' },
        { title: 'Valor', key: 'valor' },
        { title: 'Data da Parcela', key: 'dataparcela' },
        { title: 'Info. Pagamento', key: 'linhaboleto' },
        { title: 'Comprovante', key: 'comprovante' }
      ]
    case 'pagamentos':
      return [
        { title: 'Valor', key: 'valor' },
        { title: 'Data do Pagamento', key: 'datapagamento' },
        { title: 'Comprovante', key: 'comprovante' }
      ]
    default:
      return []
  }
})

const isFormValid = computed(() => {
  return selectedReport.value && startDate.value && endDate.value
})

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const generateReport = async () => {
  loading.value = true
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (!userData?.selectedfinshare) {
      throw new Error('No finshare selected')
    }

    let query

    switch (selectedReport.value) {
      case 'contas_pagar':
        query = supabase
          .from('contaspagar')
          .select(`
            id,
            tipodespesa,
            valor,
            dataparcela,
            comprovante,
            linhaboleto
          `)
          .eq('idfinshare', userData.selectedfinshare)
          .eq('status', 'A pagar')
          .gte('dataparcela', startDate.value)
          .lte('dataparcela', endDate.value)
        break

      case 'contas_pagas':
        query = supabase
          .from('contaspagar')
          .select(`
            id,
            tipodespesa,
            valor,
            dataparcela,
            comprovante,
            linhaboleto
          `)
          .eq('idfinshare', userData.selectedfinshare)
          .eq('status', 'Pago')
          .gte('dataparcela', startDate.value)
          .lte('dataparcela', endDate.value)
        break

      case 'pagamentos':
        query = supabase
          .from('contaspagas')
          .select(`
            id,
            datapagamento,
            valor,
            comprovante
          `)
          .eq('idfinshare', userData.selectedfinshare)
          .gte('datapagamento', startDate.value)
          .lte('datapagamento', endDate.value)
        break

      default:
        throw new Error('Tipo de relatório inválido')
    }

    const { data, error } = await query

    if (error) throw error

    reportData.value = data.map(item => ({
      ...item,
      datapagamento: item.datapagamento ? new Date(item.datapagamento).toLocaleDateString('pt-BR') : '-',
      valor: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(item.valor)
    }))

    showSnackbar('Relatório gerado com sucesso', 'success')
  } catch (error) {
    console.error('Error generating report:', error)
    showSnackbar('Erro ao gerar relatório: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const exportToPDF = async () => {
  exportingPDF.value = true
  try {
    const element = document.querySelector('.v-data-table')
    const opt = {
      margin: 0,
      filename: `relatorio_${selectedReport.value}_${startDate.value}_${endDate.value}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    }

    await html2pdf().set(opt).from(element).save()
    showSnackbar('PDF exportado com sucesso', 'success')
  } catch (error) {
    console.error('Error exporting PDF:', error)
    showSnackbar('Erro ao exportar PDF', 'error')
  } finally {
    exportingPDF.value = false
  }
}

const getReportTitle = () => {
  switch (selectedReport.value) {
    case 'contas_pagar':
      return 'Contas a Pagar'
    case 'contas_pagas':
      return 'Contas Pagas'
    case 'pagamentos':
      return 'Pagamentos'
    default:
      return ''
  }
}
</script>

<style scoped>
.v-data-table {
  width: 100%;
}

.report-page {
  width: 210mm;
  min-height: 297mm;
  height: 297mm;
  padding: 20mm;
  margin: 10mm auto;
  background: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  page-break-after: always;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.report-header {
  flex: 0 0 auto;
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #eee;
}

.report-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100% - 80px);
}

.info-section {
  flex: 0 0 auto;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px;
  background: #f9f9f9;
}

.comprovante-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  max-height: calc(100% - 40px);
}

.comprovante-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  color: #666;
  font-style: italic;
}
</style>

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
              :rules="[v => !!v || 'Data inicial é obrigatória']"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="endDate"
              label="Data Final"
              type="date"
              :rules="[v => !!v || 'Data final é obrigatória']"
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
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

// Configurando as fontes do pdfMake
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// Você também pode definir fontes padrão globalmente
pdfMake.fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
};

const reportTypes = [
  { title: 'Contas a Pagar', value: 'contas_pagar' },
  { title: 'Contas Pagas', value: 'contas_pagas' },
  { title: 'Pagamentos', value: 'pagamentos' }
]

const selectedReport = ref('')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')

const isFormValid = computed(() => {
  return selectedReport.value && startDate.value && endDate.value
})

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

// Função auxiliar para formatar data
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
};

const generateReport = async () => {
  loading.value = true
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (!userData?.selectedfinshare) {
      throw new Error('Nenhuma finshare selecionada')
    }

    // Buscar dados conforme o tipo de relatório selecionado
    let data = []
    if (selectedReport.value === 'contas_pagar') {
      const { data: contas, error } = await supabase
        .from('contaspagar')
        .select(`
          *,
          grupodespesa!inner (
            grupodespesa,
            descricaogrupodespesa
          )
        `)
        .eq('idfinshare', userData.selectedfinshare)
        .gte('dataparcela', startDate.value)
        .lte('dataparcela', endDate.value)
        .order('dataparcela')

      if (error) throw error
      data = contas
    } else if (selectedReport.value === 'contas_pagas' || selectedReport.value === 'pagamentos') {
      const { data: pagamentos, error } = await supabase
        .from('contaspagas')
        .select(`
          *,
          contaspagar!inner (
            tipodespesa,
            numeroparcelas,
            parcela,
            datadespesa,
            dataparcela,
            linhaboleto,
            observacoes,
            grupodespesa!inner (
              grupodespesa,
              descricaogrupodespesa
            )
          )
        `)
        .eq('idfinshare', userData.selectedfinshare)
        .gte('datapagamento', startDate.value)
        .lte('datapagamento', endDate.value)
        .order('datapagamento')

      if (error) throw error
      data = pagamentos
    }

    // Função auxiliar para converter URL em base64
    const getBase64FromUrl = async (url) => {
      if (!url) return null;
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        return null;
      }
    };

    // Carregar todas as imagens antes de gerar o PDF
    const processedData = await Promise.all(data.map(async (item) => {
      const imageUrl = item.comprovante;
      const imageBase64 = await getBase64FromUrl(imageUrl);
      return { ...item, imageBase64 };
    }));

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 80, 40, 40],
      header: {
        margin: [40, 20, 40, 0],
        columns: [
          {
            text: [
              { text: 'Sistema Hórus\n', style: 'headerTitle' },
              { text: `Relatório de ${reportTypes.find(r => r.value === selectedReport.value).title}\n`, style: 'headerSubtitle' },
              { text: `Período: ${formatDate(startDate.value)} a ${formatDate(endDate.value)}`, style: 'headerPeriod' }
            ],
            alignment: 'center'
          }
        ]
      },
      content: processedData.map(item => {
        const contaInfo = selectedReport.value === 'contas_pagar' ? item : item.contaspagar;
        
        const content = [
          {
            margin: [0, 10, 0, 0],
            layout: {
              defaultBorder: false,
              paddingTop: () => 4,
              paddingBottom: () => 4
            },
            table: {
              widths: ['50%', '50%'],
              body: [
                [
                  {
                    text: [
                      { text: 'Tipo de Despesa: ', bold: true },
                      contaInfo.tipodespesa || 'N/A',
                      '\n',
                      { text: 'Grupo de Despesa: ', bold: true },
                      contaInfo.grupodespesa?.grupodespesa || 'N/A',
                      '\n',
                      { text: 'Descrição do Grupo: ', bold: true },
                      contaInfo.grupodespesa?.descricaogrupodespesa || 'N/A',
                      '\n',
                      { text: 'Valor: ', bold: true },
                      `R$ ${Number(item.valor).toFixed(2) || '0.00'}`
                    ],
                    style: 'tableCell'
                  },
                  {
                    text: [
                      { text: 'Data da Despesa: ', bold: true },
                      formatDate(contaInfo.datadespesa),
                      '\n',
                      { text: 'Data da Parcela: ', bold: true },
                      formatDate(contaInfo.dataparcela),
                      '\n',
                      selectedReport.value !== 'contas_pagar' ? [
                        { text: 'Data do Pagamento: ', bold: true },
                        formatDate(item.datapagamento),
                        '\n'
                      ] : '',
                      { text: 'Parcela: ', bold: true },
                      `${contaInfo.parcela || '0'}/${contaInfo.numeroparcelas || '0'}`,
                      '\n',
                      { text: 'Status: ', bold: true },
                      contaInfo.status || 'N/A'
                    ],
                    style: 'tableCell'
                  }
                ]
              ]
            }
          },
          {
            text: [
              { text: 'Observações: ', bold: true },
              contaInfo.observacoes || 'N/A'
            ],
            style: 'observations',
            margin: [0, 5, 0, 5]
          }
        ];

        // Adiciona linha do boleto se existir
        if (contaInfo.linhaboleto) {
          content.push({
            text: [
              { text: 'Info. Pagamento: ', bold: true },
              contaInfo.linhaboleto
            ],
            style: 'boletoLine',
            margin: [0, 5, 0, 5]
          });
        }

        // Adiciona imagem do comprovante se existir
        if (item.imageBase64) {
          content.push(
            { 
              text: 'Comprovante:', 
              bold: true, 
              alignment: 'center', 
              margin: [0, 10, 0, 5]
            },
            {
              image: item.imageBase64,
              width: 350,
              alignment: 'center',
              fit: [350, 350]
            }
          );
        }

        // Adiciona quebra de página após cada item
        content.push({ 
          text: '', 
          pageBreak: processedData[processedData.length - 1] !== item ? 'after' : undefined 
        });

        return content;
      }).flat(),
      styles: {
        headerTitle: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 2]
        },
        headerSubtitle: {
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 2]
        },
        headerPeriod: {
          fontSize: 10,
          margin: [0, 0, 0, 0]
        },
        tableCell: {
          fontSize: 10,
          lineHeight: 1.1
        },
        observations: {
          fontSize: 10,
          lineHeight: 1.1,
          margin: [10, 0, 10, 0]
        },
        boletoLine: {
          fontSize: 10,
          lineHeight: 1.1,
          margin: [10, 0, 10, 0]
        }
      }
    };

    // Nome do arquivo com data formatada
    const fileName = `relatorio_${selectedReport.value}_${formatDate(startDate.value)}_${formatDate(endDate.value).replace(/\//g, '-')}.pdf`;
    
    pdfMake.createPdf(docDefinition).download(fileName);
    showSnackbar('Relatório gerado com sucesso', 'success');
  } catch (error) {
    console.error('Error generating report:', error);
    showSnackbar('Erro ao gerar relatório: ' + error.message, 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Estilos básicos */
.v-card {
  margin-bottom: 20px;
}
</style>

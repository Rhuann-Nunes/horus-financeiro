<template>
  <v-container 
    :class="{
      'pa-2': $vuetify.display.xs,
      'pa-4': !$vuetify.display.xs
    }" 
    fluid
  >
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-2">
          <v-toolbar 
            color="black" 
            dark 
            flat
            :height="$vuetify.display.xs ? 56 : 64"
          >
            <v-toolbar-title class="text-wrap">Pagamentos Pendentes</v-toolbar-title>
          </v-toolbar>

          <!-- Desktop view (sm and up) -->
          <v-card-text class="d-none d-sm-block">
            <v-data-table
              :headers="headers"
              :items="despesasConsolidadas"
              class="elevation-1"
              :density="$vuetify.display.xs ? 'compact' : 'default'"
            >
              <template v-slot:item="{ item }">
                <tr>
                  <td class="text-wrap">{{ item.grupo }}</td>
                  <td class="text-wrap">{{ item.tipo }}</td>
                  <td class="text-wrap">{{ formatCurrency(item.valor) }}</td>
                  <td class="text-wrap">{{ formatDate(item.data) }}</td>
                  <td>
                    <v-btn
                      color="primary"
                      :size="$vuetify.display.xs ? 'small' : 'default'"
                      @click="showPaymentDialog(item)"
                    >
                      Pagar
                    </v-btn>
                  </td>
                </tr>
              </template>
            </v-data-table>
          </v-card-text>

          <!-- Mobile view (xs only) -->
          <v-card-text class="d-sm-none">
            <v-list>
              <v-list-item
                v-for="(item, index) in despesasConsolidadas"
                :key="index"
                class="mb-4"
              >
                <v-card flat class="w-100">
                  <v-card-text>
                    <div class="text-caption mb-1">Grupo:</div>
                    <div class="text-body-1 mb-3">{{ item.grupo }}</div>
                    
                    <div class="text-caption mb-1">Tipo:</div>
                    <div class="text-body-1 mb-3">{{ item.tipo }}</div>
                    
                    <div class="text-caption mb-1">Valor:</div>
                    <div class="text-body-1 mb-3">{{ formatCurrency(item.valor) }}</div>
                    
                    <div class="text-caption mb-1">Data:</div>
                    <div class="text-body-1 mb-3">{{ formatDate(item.data) }}</div>
                    
                    <v-btn
                      color="primary"
                      size="small"
                      @click="showPaymentDialog(item)"
                      block
                    >
                      Pagar
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogos -->
    <v-dialog 
      v-model="confirmDialog" 
      :max-width="$vuetify.display.xs ? '95%' : '500px'"
    >
      <v-card>
        <v-card-title>Confirmar Pagamento</v-card-title>
        <v-card-text>
          Deseja realmente efetuar o pagamento de {{ formatCurrency(selectedDespesa?.valor) }}?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn 
            color="error" 
            text 
            @click="confirmDialog = false"
            :size="$vuetify.display.xs ? 'small' : 'default'"
          >
            Cancelar
          </v-btn>
          <v-btn 
            color="primary" 
            text 
            @click="proceedToPayment"
            :size="$vuetify.display.xs ? 'small' : 'default'"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog 
      v-model="paymentDialog" 
      :max-width="$vuetify.display.xs ? '95%' : '500px'"
    >
      <v-card>
        <v-card-title>Registrar Pagamento</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="savePayment">
            <v-text-field
              v-model="paymentForm.dataPagamento"
              label="Data do Pagamento"
              type="date"
              required
              :density="$vuetify.display.xs ? 'compact' : 'default'"
            ></v-text-field>
            <v-file-input
              v-model="paymentForm.comprovante"
              label="Comprovante"
              accept="image/*"
              prepend-icon="mdi-camera"
              :density="$vuetify.display.xs ? 'compact' : 'default'"
            ></v-file-input>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn 
            color="error" 
            text 
            @click="paymentDialog = false"
            :size="$vuetify.display.xs ? 'small' : 'default'"
          >
            Cancelar
          </v-btn>
          <v-btn 
            color="primary" 
            text 
            @click="savePayment"
            :loading="loading"
            :size="$vuetify.display.xs ? 'small' : 'default'"
          >
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar 
      v-model="snackbar" 
      :color="snackbarColor" 
      :timeout="3000"
      :position="$vuetify.display.xs ? 'bottom' : 'top'"
    >
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>
  
<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
  
const headers = [
  { title: 'Grupo', key: 'grupo' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Valor', key: 'valor' },
  { title: 'Data', key: 'data' },
  { title: 'Ações', key: 'actions', sortable: false }
]
  
const despesasConsolidadas = ref([])
const confirmDialog = ref(false)
const paymentDialog = ref(false)
const selectedDespesa = ref(null)
const loading = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
  
const paymentForm = ref({
  dataPagamento: new Date().toISOString().split('T')[0],
  comprovante: null
})
  
const verificarAtualizarAssinaturas = async () => {
  try {
    console.log('Starting subscription verification...')
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userError) throw new Error(`Failed to fetch user data: ${userError.message}`)
    if (!userData?.selectedfinshare) {
      console.log('No finshare selected, skipping subscription verification')
      return
    }

    // Fetch active subscriptions
    const { data: assinaturas, error: assinaturasError } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('status', 'ATIVA')
      .eq('idfinshare', userData.selectedfinshare)

    if (assinaturasError) throw new Error(`Failed to fetch subscriptions: ${assinaturasError.message}`)
    console.log(`Found ${assinaturas?.length || 0} active subscriptions`)

    // Get grupo despesa
    const { data: grupoDespesa, error: grupoError } = await supabase
      .from('grupodespesa')
      .select('id')
      .eq('finshareid', userData.selectedfinshare)
      .eq('grupodespesa', 'Assinaturas e Serviços')
      .single()

    if (grupoError) throw new Error(`Failed to fetch grupo despesa: ${grupoError.message}`)

    // Get current date info
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Process each subscription
    for (const assinatura of assinaturas) {
      try {
        console.log(`Processing subscription: ${assinatura.id}`)
        
        const shouldProcess = () => {
          if (assinatura.status !== 'ATIVA') {
            console.log(`Skipping subscription ${assinatura.id} - status is not ATIVA`)
            return false
          }

          if (!assinatura.datafluxo) {
            console.log(`Processing subscription ${assinatura.id} - no previous datafluxo`)
            return true
          }
          
          const dataFluxo = new Date(assinatura.datafluxo)
          const currentMonthFirstDay = new Date(Date.UTC(currentYear, currentMonth, 1))
          dataFluxo.setUTCHours(0, 0, 0, 0)
          
          // Compare with first day of current month
          if (dataFluxo.getTime() === currentMonthFirstDay.getTime()) {
            console.log(`Skipping subscription ${assinatura.id} - already processed for ${currentMonthFirstDay.toISOString().split('T')[0]}`)
            return false
          }
          
          console.log(`Processing subscription ${assinatura.id} - last processed ${dataFluxo.toISOString().split('T')[0]}`)
          return true
        }

        if (shouldProcess()) {
          // Get next iddespesa
          const { data: maxIdDespesa, error: maxIdError } = await supabase
            .from('contaspagar')
            .select('iddespesa')
            .order('iddespesa', { ascending: false })
            .limit(1)
            .single()

          if (maxIdError) throw new Error(`Failed to get max iddespesa: ${maxIdError.message}`)
          const newIdDespesa = (maxIdDespesa?.iddespesa || 0) + 1

          // Prepare payment record
          const newContaPagar = {
            tipodespesa: assinatura.iscredit ? 'Credito' : 'Debito',
            iddespesa: newIdDespesa,
            idgrupodespesa: grupoDespesa.id,
            idusuariocadastro: userData.id,
            idfinshare: assinatura.idfinshare,
            idcontabacaria: assinatura.idcontabancaria,
            idcartaocredito: assinatura.iscredit ? assinatura.idcartao : null,
            numeroparcelas: 1,
            parcela: 1,
            status: 'A pagar',
            valor: assinatura.valor,
            comprovante: null,
            linhaboleto: ''
          }

          // Set dates based on payment type
          if (assinatura.iscredit) {
            const { data: cartao, error: cartaoError } = await supabase
              .from('cartaocredito')
              .select('datavencimento')
              .eq('id', assinatura.idcartao)
              .single()

            if (cartaoError) throw new Error(`Failed to fetch credit card data: ${cartaoError.message}`)

            const dataVencimento = new Date(Date.UTC(currentYear, currentMonth, cartao.datavencimento))
            newContaPagar.datadespesa = dataVencimento.toISOString().split('T')[0]
            newContaPagar.dataparcela = dataVencimento.toISOString().split('T')[0]
          } else {
            const dataCobranca = new Date(Date.UTC(currentYear, currentMonth, assinatura.cobranca))
            newContaPagar.datadespesa = dataCobranca.toISOString().split('T')[0]
            newContaPagar.dataparcela = dataCobranca.toISOString().split('T')[0]
          }

          // Insert payment record
          const { error: insertError } = await supabase
            .from('contaspagar')
            .insert(newContaPagar)

          if (insertError) throw new Error(`Failed to insert payment: ${insertError.message}`)

          // Update datafluxo
          const { error: updateError } = await supabase
            .from('assinaturas')
            .update({ 
              datafluxo: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0] 
            })
            .eq('id', assinatura.id)

          if (updateError) throw new Error(`Failed to update datafluxo: ${updateError.message}`)
        }
      } catch (subscriptionError) {
        console.error(`Error processing subscription ${assinatura.id}:`, subscriptionError)
        throw new Error(`Failed to process subscription ${assinatura.id}: ${subscriptionError.message}`)
      }
    }
  } catch (error) {
    console.error('Error in verificarAtualizarAssinaturas:', error)
    showSnackbar(`Erro ao processar assinaturas: ${error.message}`, 'error')
  }
}
  
onMounted(async () => {
  await verificarAtualizarAssinaturas()
  await fetchDespesas()
})
  
const fetchDespesas = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()
  
    if (!userData?.selectedfinshare) return
  
    // Fetch all unpaid expenses
    const { data: despesas, error } = await supabase
      .from('contaspagar')
      .select(`
        id,
        tipodespesa,
        idgrupodespesa,
        idcartaocredito,
        dataparcela,
        valor,
        status
      `)
      .eq('status', 'A pagar')
      .eq('idfinshare', userData.selectedfinshare)
  
    if (error) throw error
  
    // Fetch all grupo despesa
    const { data: grupos } = await supabase
      .from('grupodespesa')
      .select('id, grupodespesa')
  
    // Fetch all cartões
    const { data: cartoes } = await supabase
      .from('cartaocredito')
      .select('id, banco, apelido, quatro_ultimos_digitos')
  
    // Consolidate expenses
    const consolidatedMap = new Map()
  
    for (const despesa of despesas) {
      const key = despesa.idcartaocredito 
        ? `credito_${despesa.idcartaocredito}_${despesa.dataparcela}`
        : `${despesa.idgrupodespesa}_${despesa.dataparcela}`
  
      if (!consolidatedMap.has(key)) {
        let grupoNome
        if (despesa.idcartaocredito) {
          const cartao = cartoes.find(c => c.id === despesa.idcartaocredito)
          grupoNome = cartao ? `Fatura Cartão ${cartao.banco} - ${cartao.apelido} (${cartao.quatro_ultimos_digitos})` : 'Cartão não encontrado'
        } else {
          const grupo = grupos.find(g => g.id === despesa.idgrupodespesa)
          grupoNome = grupo ? grupo.grupodespesa : 'Grupo não encontrado'
        }
  
        consolidatedMap.set(key, {
          ids: [despesa.id],
          grupo: grupoNome,
          tipo: despesa.tipodespesa,
          valor: despesa.valor,
          data: despesa.dataparcela
        })
      } else {
        const existing = consolidatedMap.get(key)
        existing.ids.push(despesa.id)
        existing.valor += despesa.valor
      }
    }
  
    despesasConsolidadas.value = Array.from(consolidatedMap.values())
  } catch (error) {
    console.error('Error fetching despesas:', error)
    showSnackbar('Erro ao buscar despesas', 'error')
  }
}
  
const showPaymentDialog = (despesa) => {
  selectedDespesa.value = despesa
  confirmDialog.value = true
}
  
const proceedToPayment = () => {
  confirmDialog.value = false
  paymentDialog.value = true
}
  
const savePayment = async () => {
  if (!paymentForm.value.dataPagamento) {
    showSnackbar('Por favor, preencha a data de pagamento', 'error')
    return
  }
  
  loading.value = true
  try {
    let comprovanteUrl = ''
    if (paymentForm.value.comprovante) {
      const file = paymentForm.value.comprovante
      const fileExtension = file.name.split('.').pop()
      const filePath = `pagamentos/comprovante_${Date.now()}.${fileExtension}`
      
      const { error: uploadError } = await supabase.storage
        .from('Comprovantes')
        .upload(filePath, file)
  
      if (uploadError) throw uploadError
  
      const { data: publicUrlData } = supabase.storage
        .from('Comprovantes')
        .getPublicUrl(filePath)
  
      comprovanteUrl = publicUrlData.publicUrl
    }
  
    // Fetch original parcelas data
    const { data: parcelas, error: parcelasError } = await supabase
      .from('contaspagar')
      .select('id, valor')
      .in('id', selectedDespesa.value.ids)
  
    if (parcelasError) throw parcelasError
  
    // Insert payment records for all consolidated IDs with their original values
    for (const parcela of parcelas) {
      const { error } = await supabase.from('contaspagas').insert({
        idcontaapagar: parcela.id,
        valor: parcela.valor, // Using the original parcela value
        datapagamento: paymentForm.value.dataPagamento,
        comprovante: comprovanteUrl
      })
  
      if (error) throw error
  
      // Update status in contaspagar
      const { error: updateError } = await supabase
        .from('contaspagar')
        .update({ status: 'Pago' })
        .eq('id', parcela.id)
  
      if (updateError) throw updateError
    }
  
    showSnackbar('Pagamento registrado com sucesso', 'success')
    paymentDialog.value = false
    await fetchDespesas()
  } catch (error) {
    console.error('Error saving payment:', error)
    showSnackbar('Erro ao salvar pagamento', 'error')
  } finally {
    loading.value = false
  }
}
  
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
  
const formatDate = (date) => {
  if (!date) return ''
  return date.split('-').reverse().join('/')
}
  
const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>
  
<style scoped>
@media (max-width: 600px) {
  .mobile-table ::v-deep .v-data-table-header {
    display: none;
  }
}

.text-wrap {
  white-space: normal;
  word-break: break-word;
}
</style>
  
  
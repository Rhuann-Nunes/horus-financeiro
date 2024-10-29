<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Cartões</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-magnify" @click="fetchCartoesCredito().then(() => showCardList = true)"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveCartaoCredito" v-model="formValid" ref="form">
              <v-autocomplete
                v-model="idConta"
                :items="contasBancarias"
                label="Conta Bancária"
                item-value="id"
                item-title="contaDescricao"
                required
                @update:model-value="updateBanco"
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.contaDescricao"></v-list-item>
                </template>
              </v-autocomplete>
              <!-- <v-text-field v-model="banco" label="Banco" required></v-text-field> -->
              <v-text-field v-model="quatroUltimosDigitos" label="4 Últimos Dígitos" type="number" required></v-text-field>
              <v-text-field v-model="apelido" label="Apelido"></v-text-field>
              <v-text-field v-model="limite" label="Limite" type="number" required></v-text-field>
              <v-text-field 
                v-model="datafechamento" 
                label="Dia do Fechamento" 
                type="number" 
                min="1" 
                max="31" 
                :rules="fechamentoRules"
                required
              ></v-text-field>
              <v-text-field 
                v-model="datavencimento" 
                label="Dia do Vencimento" 
                type="number" 
                min="1" 
                max="31" 
                :rules="vencimentoRules"
                required
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveCartaoCredito" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showCardList" max-width="800px">
      <v-card>
        <v-card-title>Cartões de Crédito</v-card-title>
        <v-card-text>
          <v-data-table :items="cartoesCredito" :headers="headers" class="elevation-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.banco }}</td>
                <td>{{ item.quatro_ultimos_digitos }}</td>
                <td>{{ item.apelido }}</td>
                <td>{{ item.limite }}</td>
                <td>{{ item.datafechamento }}</td>
                <td>{{ item.datavencimento }}</td>
                <td>
                  <v-btn icon @click="editCartao(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click="confirmDeleteCartao(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showCardList = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir este cartão de crédito?</v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="deleteCartao">Confirmar</v-btn>
          <v-btn color="error" text @click="deleteDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'

const banco = ref('')
const quatroUltimosDigitos = ref('')
const apelido = ref('')
const limite = ref('')
const idConta = ref(null)
const contasBancarias = ref([])
const cartoesCredito = ref([])
const datafechamento = ref('')
const datavencimento = ref('')
const showCardList = ref(false)
const deleteDialog = ref(false)
const selectedCartaoId = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const loading = ref(false)

const headers = [
  { title: 'Banco', key: 'banco' },
  { title: '4 Últimos Dígitos', key: 'quatro_ultimos_digitos' },
  { title: 'Apelido', key: 'apelido' },
  { title: 'Limite', key: 'limite' },
  { title: 'Fechamento', key: 'datafechamento' },
  { title: 'Vencimento', key: 'datavencimento' },
  { title: 'Ações', key: 'actions', sortable: false }
]

onMounted(async () => {
  await fetchContasBancarias()
  await fetchCartoesCredito()
})

const fetchContasBancarias = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: contas, error } = await supabase
        .from('contabancaria')
        .select('id, banco, conta, agencia')
        .eq('finshareid', userData.selectedfinshare)
        .eq('titular', userData.id)

      if (error) throw error

      contasBancarias.value = contas.map(conta => ({
        id: conta.id,
        contaDescricao: `${conta.banco} - Conta: ${conta.conta} - Agência: ${conta.agencia}`,
        banco: conta.banco
      }))
    }
  } catch (error) {
    console.error('Error fetching contas bancarias:', error)
    showSnackbar('Error fetching contas bancarias', 'error')
  }
}

const fetchCartoesCredito = async () => {
  try {
    // Get the authenticated user's id and selectedfinshare
    const { data: userData, error: userError } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
      throw new Error('Failed to fetch user data')
    }

    if (!userData || !userData.selectedfinshare) {
      console.error('No selected finshare found for the user')
      cartoesCredito.value = []
      return
    }

    // Get the bank accounts owned by the user in the selected finshare
    const { data: contas, error: contasError } = await supabase
      .from('contabancaria')
      .select('id')
      .eq('finshareid', userData.selectedfinshare)
      .eq('titular', userData.id)

    if (contasError) {
      console.error('Error fetching contas bancarias:', contasError)
      throw new Error('Failed to fetch contas bancarias')
    }

    const contaIds = contas.map(conta => conta.id)

    // Get the credit cards associated with the user's bank accounts
    const { data: cartoes, error: cartoesError } = await supabase
      .from('cartaocredito')
      .select('*')
      .in('id_conta', contaIds)

    if (cartoesError) {
      console.error('Error fetching cartoes credito:', cartoesError)
      throw new Error('Failed to fetch cartoes credito')
    }

    cartoesCredito.value = cartoes || []
  } catch (error) {
    console.error('Error in fetchCartoesCredito:', error)
    showSnackbar('Error fetching cartoes credito', 'error')
  }
}

const saveCartaoCredito = async () => {
  if (!formValid.value) {
    showSnackbar('Por favor, corrija os erros no formulário', 'error')
    return
  }

  loading.value = true
  try {
    // Validate required fields
    if (!idConta.value || !banco.value || !quatroUltimosDigitos.value || 
        !limite.value || !datafechamento.value || !datavencimento.value) {
      throw new Error('Todos os campos obrigatórios devem ser preenchidos')
    }

    const newCartao = {
      id_conta: idConta.value,
      banco: banco.value,
      quatro_ultimos_digitos: parseInt(quatroUltimosDigitos.value),
      apelido: apelido.value,
      limite: parseFloat(limite.value),
      data_do_cadastro: new Date().toISOString().split('T')[0],
      datafechamento: parseInt(datafechamento.value),
      datavencimento: parseInt(datavencimento.value)
    }

    if (selectedCartaoId.value) {
      const { error } = await supabase
        .from('cartaocredito')
        .update(newCartao)
        .eq('id', selectedCartaoId.value)

      if (error) throw error

      showSnackbar('Cartão atualizado com sucesso', 'success')
    } else {
      const { error } = await supabase
        .from('cartaocredito')  // Fixed table name
        .insert(newCartao)

      if (error) throw error

      showSnackbar('Cartão cadastrado com sucesso', 'success')
    }

    await fetchCartoesCredito()
    resetForm()
  } catch (error) {
    console.error('Error saving cartao credito:', error.message || error)
    showSnackbar(`Erro ao salvar cartão: ${error.message || 'Erro desconhecido'}`, 'error')
  } finally {
    loading.value = false
  }
}

const editCartao = (cartao) => {
  idConta.value = cartao.id_conta
  banco.value = cartao.banco
  quatroUltimosDigitos.value = cartao.quatro_ultimos_digitos
  apelido.value = cartao.apelido
  limite.value = cartao.limite
  datafechamento.value = cartao.datafechamento
  datavencimento.value = cartao.datavencimento
  selectedCartaoId.value = cartao.id
  showCardList.value = false
}

const deleteCartao = async () => {
  try {
    const { error } = await supabase
      .from('cartaocredito')
      .delete()
      .eq('id', selectedCartaoId.value)

    if (error) throw error

    showSnackbar('Cartão excluído com sucesso', 'success')
    fetchCartoesCredito()
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting cartao credito:', error)
    showSnackbar('Error deleting cartao credito', 'error')
  }
}

const confirmDeleteCartao = (cartao) => {
  selectedCartaoId.value = cartao.id
  deleteDialog.value = true
}

const resetForm = () => {
  banco.value = ''
  quatroUltimosDigitos.value = ''
  apelido.value = ''
  limite.value = ''
  idConta.value = null
  datafechamento.value = ''
  datavencimento.value = ''
  selectedCartaoId.value = null
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const updateBanco = () => {
  const selectedConta = contasBancarias.value.find(conta => conta.id === idConta.value);
  if (selectedConta) {
    banco.value = selectedConta.banco;
  } else {
    banco.value = '';
  }
}

// Add these refs after the existing refs
const formValid = ref(true)
const fechamentoRules = ref([
  v => !!v || 'Dia do fechamento é obrigatório',
  v => (v >= 1 && v <= 31) || 'Dia deve estar entre 1 e 31'
])
const vencimentoRules = ref([
  v => !!v || 'Dia do vencimento é obrigatório',
  v => (v >= 1 && v <= 31) || 'Dia deve estar entre 1 e 31'
])

</script>


<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Assinaturas</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-magnify" @click="showSubscriptionList = true"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveAssinatura">
              <v-text-field v-model="assinatura" label="Assinatura" required></v-text-field>
              <v-autocomplete
                v-model="idContaBancaria"
                :items="contasBancarias"
                label="Conta Bancária"
                item-value="id"
                item-title="descricao"
                required
                @update:model-value="fetchCartoesCredito"
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.descricao"></v-list-item>
                </template>
              </v-autocomplete>
              <v-text-field
                v-if="!isCredit"
                v-model="cobranca"
                label="Dia da Cobrança"
                type="number"
                min="1"
                max="31"
                :rules="[v => (isCredit || (v && v >= 1 && v <= 31)) || 'Dia deve ser entre 1 e 31']"
                required
              ></v-text-field>
              <v-select v-model="status" :items="statusOptions" label="Status" required></v-select>
              <v-text-field v-model="dataAssinatura" label="Data da Assinatura" type="date" required></v-text-field>
              <v-switch v-model="isCredit" label="É Crédito?"></v-switch>
              <v-autocomplete
                v-model="idCartao"
                :items="cartoesCredito"
                label="Cartão de Crédito"
                item-value="id"
                item-title="nome"
                v-if="isCredit"
              ></v-autocomplete>
              <v-text-field
                v-model="valor"
                label="Valor da Assinatura"
                type="number"
                step="0.01"
                required
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveAssinatura" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showSubscriptionList" max-width="800px">
      <v-card>
        <v-card-title>Assinaturas</v-card-title>
        <v-card-text>
          <v-data-table :items="assinaturas" :headers="headers" class="elevation-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.assinatura }}</td>
                <td>{{ item.status }}</td>
                <td>{{ item.data_assinatura }}</td>
                <td>{{ item.cobranca }}</td>
                <td>{{ item.is_credit ? 'Sim' : 'Não' }}</td>
                <td>{{ item.valor }}</td>
                <td>
                  <v-btn icon @click="editAssinatura(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click="confirmDeleteAssinatura(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showSubscriptionList = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir esta assinatura?</v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="deleteAssinatura">Confirmar</v-btn>
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
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/utils/supabase'

const assinatura = ref('')
const status = ref('')
const dataAssinatura = ref('')
const cobranca = ref('')
const isCredit = ref(false)
const idCartao = ref(null)
const assinaturas = ref([])
const showSubscriptionList = ref(false)
const deleteDialog = ref(false)
const selectedAssinaturaId = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const loading = ref(false)
const valor = ref('')

const statusOptions = ['ATIVA', 'PARALISADA']
const cartoesCredito = ref([])

const headers = [
  { title: 'Assinatura', key: 'assinatura' },
  { title: 'Status', key: 'status' },
  { title: 'Data Assinatura', key: 'data_assinatura' },
  { title: 'Dia da Cobrança', key: 'cobranca' },
  { title: 'É Crédito?', key: 'is_credit' },
  { title: 'Valor', key: 'valor' },
  { title: 'Ações', key: 'actions', sortable: false }
]

const contasBancarias = ref([])
const idContaBancaria = ref(null)

onMounted(() => {
  fetchAssinaturas()
  fetchCartoesCredito()
  fetchContasBancarias()
})

const fetchAssinaturas = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: assinaturasData, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('idfinshare', userData.selectedfinshare)

      if (error) throw error

      assinaturas.value = assinaturasData
    }
  } catch (error) {
    console.error('Error fetching assinaturas:', error)
    showSnackbar('Error fetching assinaturas', 'error')
  }
}

const fetchCartoesCredito = async () => {
  try {
    if (!idContaBancaria.value) {
      cartoesCredito.value = []
      return
    }

    const { data, error } = await supabase
      .from('cartaocredito')
      .select('id, banco, quatro_ultimos_digitos, apelido')
      .eq('id_conta', idContaBancaria.value)

    if (error) throw error
    cartoesCredito.value = data.map(cartao => ({
      id: cartao.id,
      nome: `${cartao.banco} - ${cartao.apelido} (${cartao.quatro_ultimos_digitos})`
    }))
  } catch (error) {
    console.error('Error fetching cartoes credito:', error)
    showSnackbar('Error fetching cartoes credito', 'error')
  }
}

const fetchContasBancarias = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data, error } = await supabase
        .from('contabancaria')
        .select('id, banco, conta, agencia')
        .eq('finshareid', userData.selectedfinshare)

      if (error) throw error
      contasBancarias.value = data.map(conta => ({
        id: conta.id,
        descricao: `${conta.banco} - Conta: ${conta.conta} - Agência: ${conta.agencia}`
      }))
    }
  } catch (error) {
    console.error('Error fetching contas bancarias:', error)
    showSnackbar('Error fetching contas bancarias', 'error')
  }
}

const saveAssinatura = async () => {
  loading.value = true
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    const newAssinatura = {
      idusuario: userData.id,
      idfinshare: userData.selectedfinshare,
      assinatura: assinatura.value,
      status: status.value,
      dataassinatura: new Date(dataAssinatura.value).toISOString(),
      cobranca: parseInt(cobranca.value),
      iscredit: isCredit.value,
      idcartao: isCredit.value ? idCartao.value : null,
      valor: parseFloat(valor.value),
      idcontabancaria: idContaBancaria.value
    }

    if (selectedAssinaturaId.value) {
      const { error } = await supabase
        .from('assinaturas')
        .update(newAssinatura)
        .eq('id', selectedAssinaturaId.value)

      if (error) throw error

      showSnackbar('Assinatura atualizada com sucesso', 'success')
    } else {
      const { error } = await supabase.from('assinaturas').insert(newAssinatura)

      if (error) throw error

      showSnackbar('Assinatura cadastrada com sucesso', 'success')
    }

    fetchAssinaturas()
    resetForm()
  } catch (error) {
    console.error('Error saving assinatura:', error)
    showSnackbar('Error saving assinatura', 'error')
  } finally {
    loading.value = false
  }
}

const editAssinatura = (assinatura) => {
  assinatura.value = assinatura.assinatura
  status.value = assinatura.status
  dataAssinatura.value = assinatura.data_assinatura
  cobranca.value = assinatura.cobranca
  isCredit.value = assinatura.is_credit
  idCartao.value = assinatura.id_cartao
  valor.value = assinatura.valor
  idContaBancaria.value = assinatura.idcontabancaria
  selectedAssinaturaId.value = assinatura.id
  showSubscriptionList.value = false
}

const deleteAssinatura = async () => {
  try {
    const { error } = await supabase
      .from('assinaturas')
      .delete()
      .eq('id', selectedAssinaturaId.value)

    if (error) throw error

    showSnackbar('Assinatura excluída com sucesso', 'success')
    fetchAssinaturas()
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting assinatura:', error)
    showSnackbar('Error deleting assinatura', 'error')
  }
}

const confirmDeleteAssinatura = (assinatura) => {
  selectedAssinaturaId.value = assinatura.id
  deleteDialog.value = true
}

const resetForm = () => {
  assinatura.value = ''
  status.value = ''
  dataAssinatura.value = ''
  cobranca.value = ''
  isCredit.value = false
  idCartao.value = null
  valor.value = ''
  idContaBancaria.value = null
  selectedAssinaturaId.value = null
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

watch(idContaBancaria, async (newValue) => {
  if (newValue) {
    await fetchCartoesCredito()
  } else {
    cartoesCredito.value = []
  }
})
</script>


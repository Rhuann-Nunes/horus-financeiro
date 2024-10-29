<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Conta Bancária</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-magnify" @click="showAccountList = true"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveContaBancaria">
              <v-text-field v-model="banco" label="Banco" required></v-text-field>
              <v-text-field v-model="conta" label="Conta" required></v-text-field>
              <v-text-field v-model="agencia" label="Agência" required></v-text-field>
              <v-text-field v-model="saldoInicial" label="Saldo Inicial" type="number" required></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveContaBancaria" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showAccountList" max-width="800px">
      <v-card>
        <v-card-title>Contas Bancárias</v-card-title>
        <v-card-text>
          <v-data-table :items="contasBancarias" :headers="headers" class="elevation-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.banco }}</td>
                <td>{{ item.conta }}</td>
                <td>{{ item.agencia }}</td>
                <td>{{ item.saldo_inicial }}</td>
                <td>
                  <v-btn icon @click="editConta(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click="confirmDeleteConta(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showAccountList = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir esta conta bancária?</v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="deleteConta">Confirmar</v-btn>
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
const conta = ref('')
const agencia = ref('')
const saldoInicial = ref('')
const contasBancarias = ref([])
const showAccountList = ref(false)
const deleteDialog = ref(false)
const selectedContaId = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const loading = ref(false)

const headers = [
  { title: 'Banco', key: 'banco' },
  { title: 'Conta', key: 'conta' },
  { title: 'Agência', key: 'agencia' },
  { title: 'Saldo Inicial', key: 'saldo_inicial' },
  { title: 'Ações', key: 'actions', sortable: false }
]

onMounted(() => {
  fetchContasBancarias()
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
        .select('*')
        .eq('finshareid', userData.selectedfinshare)

      if (error) throw error

      contasBancarias.value = contas
    }
  } catch (error) {
    console.error('Error fetching contas bancarias:', error)
    showSnackbar('Error fetching contas bancarias', 'error')
  }
}

const saveContaBancaria = async () => {
  loading.value = true
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    const newConta = {
      finshareid: userData.selectedfinshare,
      titular: userData.id,
      banco: banco.value,
      conta: conta.value,
      agencia: agencia.value,
      saldo_inicial: parseFloat(saldoInicial.value),
      data_do_cadastro: new Date().toISOString()
    }

    if (selectedContaId.value) {
      // Update existing record
      const { error } = await supabase
        .from('contabancaria')
        .update(newConta)
        .eq('id', selectedContaId.value)

      if (error) throw error

      showSnackbar('Conta bancária atualizada com sucesso', 'success')
    } else {
      // Create new record
      const { error } = await supabase.from('contabancaria').insert(newConta)

      if (error) throw error

      showSnackbar('Conta bancária cadastrada com sucesso', 'success')
    }

    fetchContasBancarias()
    resetForm()
  } catch (error) {
    console.error('Error saving conta bancaria:', error)
    showSnackbar('Error saving conta bancaria', 'error')
  } finally {
    loading.value = false
  }
}

const editConta = (conta) => {
  banco.value = conta.banco
  conta.value = conta.conta
  agencia.value = conta.agencia
  saldoInicial.value = conta.saldo_inicial
  selectedContaId.value = conta.id
  showAccountList.value = false
}

const deleteConta = async () => {
  try {
    const { error } = await supabase
      .from('contabancaria')
      .delete()
      .eq('id', selectedContaId.value)

    if (error) throw error

    showSnackbar('Conta bancária excluída com sucesso', 'success')
    fetchContasBancarias()
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting conta bancaria:', error)
    showSnackbar('Error deleting conta bancaria', 'error')
  }
}

const confirmDeleteConta = (conta) => {
  selectedContaId.value = conta.id
  deleteDialog.value = true
}

const resetForm = () => {
  banco.value = ''
  conta.value = ''
  agencia.value = ''
  saldoInicial.value = ''
  selectedContaId.value = null
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

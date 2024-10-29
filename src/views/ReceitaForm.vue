<template>
  <v-container class="fill-height" fluid>
    <v-row v-if="isLoading" align="center" justify="center">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>
    <v-row v-else-if="error" align="center" justify="center">
      <v-col cols="12" class="text-center">
        <v-alert type="error">{{ error }}</v-alert>
      </v-col>
    </v-row>
    <v-row v-else align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Receitas</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-magnify" @click="showReceiptList = true"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveReceita">
              <v-select
                v-model="idGrupoReceita"
                :items="gruposReceita"
                label="Grupo de Receita"
                item-value="id"
                item-title="gruporeceita"
                required
              ></v-select>
              <v-select
                v-model="idContaBancaria"
                :items="contasBancarias"
                label="Conta Bancária"
                item-value="id"
                item-title="contaDescricao"
                required
              ></v-select>
              <v-text-field
                v-model="data"
                label="Data da Receita"
                type="date"
                required
              ></v-text-field>
              <v-text-field v-model="valor" label="Valor da Receita" type="number" required></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveReceita" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showReceiptList" max-width="800px">
      <v-card>
        <v-card-title>Receitas Cadastradas</v-card-title>
        <v-card-text>
          <v-data-table :items="receitas" :headers="headers" class="elevation-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.gruporeceita }}</td>
                <td>{{ item.contabancaria }}</td>
                <td>{{ item.data }}</td>
                <td>{{ item.valor }}</td>
                <td>
                  <v-btn icon @click="editReceita(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click="confirmDeleteReceita(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showReceiptList = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir esta receita?</v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="deleteReceita">Confirmar</v-btn>
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'

const idGrupoReceita = ref(null)
const idContaBancaria = ref(null)
const data = ref(new Date().toISOString().split('T')[0])
const valor = ref('')
const gruposReceita = ref([])
const contasBancarias = ref([])
const receitas = ref([])
const showReceiptList = ref(false)
const deleteDialog = ref(false)
const selectedReceitaId = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const loading = ref(false)
const isLoading = ref(true)
const error = ref(null)
let isMounted = false

const headers = [
  { title: 'Grupo de Receita', key: 'gruporeceita' },
  { title: 'Conta Bancária', key: 'contabancaria' },
  { title: 'Data', key: 'data' },
  { title: 'Valor', key: 'valor' },
  { title: 'Ações', key: 'actions', sortable: false }
]

onMounted(async () => {
  isMounted = true
  await nextTick()
  await loadInitialData()
})

onUnmounted(() => {
  isMounted = false
})

const loadInitialData = async () => {
  if (!isMounted) return
  
  isLoading.value = true
  error.value = null
  
  try {
    await Promise.all([
      fetchGruposReceita(),
      fetchContasBancarias(),
      fetchReceitas()
    ])
  } catch (err) {
    console.error('Error loading initial data:', err)
    if (isMounted) {
      error.value = 'Error loading initial data. Please try again.'
    }
  } finally {
    if (isMounted) {
      isLoading.value = false
    }
  }
}

const fetchGruposReceita = async () => {
  if (!isMounted) return
  
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: grupos, error: gruposError } = await supabase
        .from('gruporeceita')
        .select('*')
        .eq('finshareid', userData.selectedfinshare)

      if (gruposError) throw gruposError

      if (isMounted) {
        gruposReceita.value = grupos
      }
    } else {
      throw new Error('No selected finshare')
    }
  } catch (err) {
    console.error('Error fetching grupos receita:', err)
    throw err
  }
}

const fetchContasBancarias = async () => {
  if (!isMounted) return
  
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: contas, error: contasError } = await supabase
        .from('contabancaria')
        .select('*')
        .eq('finshareid', userData.selectedfinshare)

      if (contasError) throw contasError

      if (isMounted) {
        contasBancarias.value = contas.map(conta => ({
          id: conta.id,
          contaDescricao: `${conta.banco} - Conta: ${conta.conta} - Agência: ${conta.agencia}`
        }))
      }
    }
  } catch (err) {
    console.error('Error fetching contas bancarias:', err)
    throw err
  }
}

const fetchReceitas = async () => {
  if (!isMounted) return
  
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          *,
          gruporeceita (gruporeceita),
          contabancaria (banco, conta, agencia)
        `)
        .eq('idfinshare', userData.selectedfinshare)

      if (receitasError) throw receitasError

      if (isMounted) {
        receitas.value = receitasData.map(receita => ({
          ...receita,
          gruporeceita: receita.gruporeceita.gruporeceita,
          contabancaria: `${receita.contabancaria.banco} - Conta: ${receita.contabancaria.conta} - Agência: ${receita.contabancaria.agencia}`
        }))
      }
    }
  } catch (err) {
    console.error('Error fetching receitas:', err)
    throw err
  }
}

const saveReceita = async () => {
  if (!isMounted) return
  
  loading.value = true
  error.value = null
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    const newReceita = {
      idgruporeceita: idGrupoReceita.value,
      idusuariocadastro: userData.id,
      idfinshare: userData.selectedfinshare,
      idcontabancaria: idContaBancaria.value,
      data: new Date(data.value).toISOString(),
      valor: parseFloat(valor.value)
    }

    if (selectedReceitaId.value) {
      const { error } = await supabase
        .from('receitas')
        .update(newReceita)
        .eq('id', selectedReceitaId.value)

      if (error) throw error

      showSnackbar('Receita atualizada com sucesso', 'success')
    } else {
      const { error } = await supabase.from('receitas').insert(newReceita)

      if (error) throw error

      showSnackbar('Receita cadastrada com sucesso', 'success')
    }

    await fetchReceitas()
    resetForm()
  } catch (err) {
    console.error('Error saving receita:', err)
    if (isMounted) {
      error.value = 'Error saving receita. Please try again.'
    }
  } finally {
    if (isMounted) {
      loading.value = false
    }
  }
}

const editReceita = (receita) => {
  idGrupoReceita.value = receita.idgruporeceita
  idContaBancaria.value = receita.idcontabancaria
  data.value = new Date(receita.data).toISOString().split('T')[0]
  valor.value = receita.valor
  selectedReceitaId.value = receita.id
  showReceiptList.value = false
}

const deleteReceita = async () => {
  try {
    const { error } = await supabase
      .from('receitas')
      .delete()
      .eq('id', selectedReceitaId.value)

    if (error) throw error

    showSnackbar('Receita excluída com sucesso', 'success')
    await fetchReceitas()
    deleteDialog.value = false
  } catch (err) {
    console.error('Error deleting receita:', err)
    showSnackbar('Error deleting receita', 'error')
  }
}

const confirmDeleteReceita = (receita) => {
  selectedReceitaId.value = receita.id
  deleteDialog.value = true
}

const resetForm = () => {
  idGrupoReceita.value = null
  idContaBancaria.value = null
  data.value = ''
  valor.value = ''
  selectedReceitaId.value = null
}

const showSnackbar = (text, color) => {
  if (isMounted) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }
}
</script>

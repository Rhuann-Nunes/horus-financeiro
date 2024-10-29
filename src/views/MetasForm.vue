<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Metas R$</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-magnify" @click="showGoalsList = true"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveMeta">
              <v-text-field
                v-model="descricao"
                label="Descrição da Meta"
                required
              ></v-text-field>
              <v-text-field
                v-model="valor"
                label="Valor da Meta"
                type="number"
                required
              ></v-text-field>
              <v-text-field
                v-model="dataAlvo"
                label="Data Alvo"
                type="date"
                required
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveMeta" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showGoalsList" max-width="800px">
      <v-card>
        <v-card-title>Metas Cadastradas</v-card-title>
        <v-card-text>
          <v-data-table :items="metas" :headers="headers" class="elevation-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.descricao }}</td>
                <td>{{ formatCurrency(item.valor) }}</td>
                <td>{{ formatDate(item.dataalvo) }}</td>
                <td>
                  <v-btn icon @click="editMeta(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click="confirmDeleteMeta(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showGoalsList = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir esta meta?</v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="deleteMeta">Confirmar</v-btn>
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

const descricao = ref('')
const valor = ref('')
const dataAlvo = ref('')
const metas = ref([])
const showGoalsList = ref(false)
const deleteDialog = ref(false)
const selectedMetaId = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const loading = ref(false)

const headers = [
  { title: 'Descrição', key: 'descricao' },
  { title: 'Valor', key: 'valor' },
  { title: 'Data Alvo', key: 'dataalvo' },
  { title: 'Ações', key: 'actions', sortable: false }
]

onMounted(() => {
  fetchMetas()
})

const fetchMetas = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: metasData, error } = await supabase
        .from('metas')
        .select('*')
        .eq('idfinshare', userData.selectedfinshare)

      if (error) throw error

      metas.value = metasData
    }
  } catch (error) {
    console.error('Error fetching metas:', error)
    showSnackbar('Error fetching metas', 'error')
  }
}

const saveMeta = async () => {
  loading.value = true
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    const newMeta = {
      idfinshare: userData.selectedfinshare,
      idusuariocadastro: userData.id,
      descricao: descricao.value,
      valor: parseFloat(valor.value),
      dataalvo: dataAlvo.value
    }

    if (selectedMetaId.value) {
      const { error } = await supabase
        .from('metas')
        .update(newMeta)
        .eq('id', selectedMetaId.value)

      if (error) throw error

      showSnackbar('Meta atualizada com sucesso', 'success')
    } else {
      const { error } = await supabase.from('metas').insert(newMeta)

      if (error) throw error

      showSnackbar('Meta cadastrada com sucesso', 'success')
    }

    fetchMetas()
    resetForm()
  } catch (error) {
    console.error('Error saving meta:', error)
    showSnackbar('Error saving meta', 'error')
  } finally {
    loading.value = false
  }
}

const editMeta = (meta) => {
  descricao.value = meta.descricao
  valor.value = meta.valor
  dataAlvo.value = meta.dataalvo
  selectedMetaId.value = meta.id
  showGoalsList.value = false
}

const deleteMeta = async () => {
  try {
    const { error } = await supabase
      .from('metas')
      .delete()
      .eq('id', selectedMetaId.value)

    if (error) throw error

    showSnackbar('Meta excluída com sucesso', 'success')
    fetchMetas()
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting meta:', error)
    showSnackbar('Error deleting meta', 'error')
  }
}

const confirmDeleteMeta = (meta) => {
  selectedMetaId.value = meta.id
  deleteDialog.value = true
}

const resetForm = () => {
  descricao.value = ''
  valor.value = ''
  dataAlvo.value = ''
  selectedMetaId.value = null
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('pt-BR')
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>


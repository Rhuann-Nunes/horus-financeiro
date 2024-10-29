<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Grupos: Despesa</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-magnify" @click="showGroupList = true"></v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveGrupoDespesa">
              <v-text-field v-model="grupodespesa" label="Nome do Grupo" required></v-text-field>
              <v-textarea v-model="descricaogrupodespesa" label="Descrição" rows="3"></v-textarea>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveGrupoDespesa" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showGroupList" max-width="800px">
      <v-card>
        <v-card-title>Grupos de Despesa</v-card-title>
        <v-card-text>
          <v-data-table :items="gruposDespesa" :headers="headers" class="elevation-1">
            <template v-slot:item="{ item }">
              <tr>
                <td>{{ item.grupodespesa }}</td>
                <td>{{ item.descricaogrupodespesa }}</td>
                <td>
                  <v-btn icon @click="editGrupo(item)">
                    <v-icon>mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon @click="confirmDeleteGrupo(item)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="showGroupList = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="500px">
      <v-card>
        <v-card-title>Confirmar Exclusão</v-card-title>
        <v-card-text>Tem certeza que deseja excluir este grupo de despesa?</v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="deleteGrupo">Confirmar</v-btn>
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

const grupodespesa = ref('')
const descricaogrupodespesa = ref('')
const gruposDespesa = ref([])
const showGroupList = ref(false)
const deleteDialog = ref(false)
const selectedGrupoId = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')
const loading = ref(false)

const headers = [
  { title: 'Nome do Grupo', key: 'grupodespesa' },
  { title: 'Descrição', key: 'descricaogrupodespesa' },
  { title: 'Ações', key: 'actions', sortable: false }
]

onMounted(() => {
  fetchGruposDespesa()
})

const fetchGruposDespesa = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data: grupos, error } = await supabase
        .from('grupodespesa')
        .select('*')
        .eq('finshareid', userData.selectedfinshare)

      if (error) throw error

      gruposDespesa.value = grupos
    }
  } catch (error) {
    console.error('Error fetching grupos despesa:', error)
    showSnackbar('Error fetching grupos despesa', 'error')
  }
}

const saveGrupoDespesa = async () => {
  loading.value = true
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    const newGrupo = {
      finshareid: userData.selectedfinshare,
      grupodespesa: grupodespesa.value,
      descricaogrupodespesa: descricaogrupodespesa.value
    }

    if (selectedGrupoId.value) {
      const { error } = await supabase
        .from('grupodespesa')
        .update(newGrupo)
        .eq('id', selectedGrupoId.value)

      if (error) throw error

      showSnackbar('Grupo de despesa atualizado com sucesso', 'success')
    } else {
      const { error } = await supabase.from('grupodespesa').insert(newGrupo)

      if (error) throw error

      showSnackbar('Grupo de despesa cadastrado com sucesso', 'success')
    }

    fetchGruposDespesa()
    resetForm()
  } catch (error) {
    console.error('Error saving grupo despesa:', error)
    showSnackbar('Error saving grupo despesa', 'error')
  } finally {
    loading.value = false
  }
}

const editGrupo = (grupo) => {
  grupodespesa.value = grupo.grupodespesa
  descricaogrupodespesa.value = grupo.descricaogrupodespesa
  selectedGrupoId.value = grupo.id
  showGroupList.value = false
}

const deleteGrupo = async () => {
  try {
    const { error } = await supabase
      .from('grupodespesa')
      .delete()
      .eq('id', selectedGrupoId.value)

    if (error) throw error

    showSnackbar('Grupo de despesa excluído com sucesso', 'success')
    fetchGruposDespesa()
    deleteDialog.value = false
  } catch (error) {
    console.error('Error deleting grupo despesa:', error)
    showSnackbar('Error deleting grupo despesa', 'error')
  }
}

const confirmDeleteGrupo = (grupo) => {
  selectedGrupoId.value = grupo.id
  deleteDialog.value = true
}

const resetForm = () => {
  grupodespesa.value = ''
  descricaogrupodespesa.value = ''
  selectedGrupoId.value = null
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>


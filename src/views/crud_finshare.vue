<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="10" md="8" lg="6">
        <v-card class="elevation-12">
          <v-toolbar 
            color="black" 
            dark 
            flat
            :density="$vuetify.display.xs ? 'compact' : 'default'"
          >
            <v-toolbar-title :class="$vuetify.display.xs ? 'text-subtitle-1' : ''">
              Gerenciar Finshares
            </v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <h2 :class="$vuetify.display.xs ? 'text-subtitle-1 mb-2 font-weight-bold' : 'text-h5 mb-4 font-weight-bold'">
              Minhas Finshares
            </h2>
            <v-list :density="$vuetify.display.xs ? 'compact' : 'default'">
              <v-list-item v-for="finshare in userFinshares" :key="finshare.id">
                <template v-slot:prepend>
                  <v-list-item-title>{{ finshare.finsharename }}</v-list-item-title>
                </template>
                <template v-slot:append>
                  <v-switch
                    v-model="finshare.selected"
                    color="success"
                    @change="selectFinshare(finshare.id)"
                  ></v-switch>
                </template>
              </v-list-item>
            </v-list>

            <h2 :class="$vuetify.display.xs ? 'text-subtitle-1 mb-2 mt-4 font-weight-bold' : 'text-h5 mb-4 mt-6 font-weight-bold'">
              Finshares Compartilhadas
            </h2>
            <v-list :density="$vuetify.display.xs ? 'compact' : 'default'">
              <v-list-item v-for="finshare in sharedFinshares" :key="finshare.id">
                <template v-slot:prepend>
                  <v-list-item-title>{{ finshare.finsharename }}</v-list-item-title>
                </template>
                <template v-slot:append>
                  <v-switch
                    v-model="finshare.selected"
                    color="success"
                    @change="selectFinshare(finshare.id)"
                  ></v-switch>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions :class="$vuetify.display.xs ? 'flex-column gap-2' : ''">
            <v-spacer v-if="!$vuetify.display.xs"></v-spacer>
            <v-btn 
              @click="saveSelectedFinshare" 
              color="primary" 
              :class="$vuetify.display.xs ? 'w-100' : 'mr-2'"
              :size="$vuetify.display.xs ? 'small' : 'default'"
            >
              Gravar
            </v-btn>
            <v-btn 
              @click="createNewFinshare" 
              color="secondary" 
              :class="$vuetify.display.xs ? 'w-100' : 'mr-2'"
              :size="$vuetify.display.xs ? 'small' : 'default'"
            >
              Criar Nova Finshare
            </v-btn>
            <v-btn 
              @click="shareDialog = true" 
              color="info"
              :class="$vuetify.display.xs ? 'w-100' : ''"
              :size="$vuetify.display.xs ? 'small' : 'default'"
            >
              Compartilhar Finshare
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog 
      v-model="shareDialog" 
      :max-width="$vuetify.display.xs ? '100%' : '500px'"
      :fullscreen="$vuetify.display.xs"
    >
      <v-card>
        <v-toolbar v-if="$vuetify.display.xs" density="compact">
          <v-toolbar-title class="text-subtitle-1">Compartilhar Finshare</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon @click="shareDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-title v-else>Compartilhar Finshare</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedShareFinshareId"
            :items="userFinshares"
            item-title="finsharename"
            item-value="id"
            label="Selecione a Finshare para compartilhar"
          ></v-select>
          <v-text-field v-model="partnerEmail" label="E-mail do parceiro"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="shareFinshare">Compartilhar</v-btn>
          <v-btn color="error" text @click="shareDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <v-dialog 
      v-model="createDialog" 
      :max-width="$vuetify.display.xs ? '100%' : '500px'"
      :fullscreen="$vuetify.display.xs"
    >
      <v-card>
        <v-toolbar v-if="$vuetify.display.xs" density="compact">
          <v-toolbar-title class="text-subtitle-1">Criar Nova Finshare</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon @click="createDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>
        <v-card-title v-else>Criar Nova Finshare</v-card-title>
        <v-card-text>
          <v-text-field v-model="newFinshareName" label="Nome da Nova Finshare"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="confirmCreateNewFinshare">Criar</v-btn>
          <v-btn color="error" text @click="createDialog = false">Cancelar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'

const router = useRouter()
const userFinshares = ref([])
const sharedFinshares = ref([])
const selectedFinshareId = ref(null)
const shareDialog = ref(false)
const partnerEmail = ref('')
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')

// New refs
const createDialog = ref(false)
const newFinshareName = ref('')
const selectedShareFinshareId = ref(null)

onMounted(() => {
  fetchUserFinshares()
})

const fetchUserFinshares = async () => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userError || !userData) {
      throw userError || new Error('User not found in perfisusuarios')
    }

    const userId = userData.id
    const selectedFinshareIdFromDB = userData.selectedfinshare

    // Fetch finshares where the user is the creator
    const { data: finshareData, error: finshareError } = await supabase
      .from('finshare')
      .select('id, finsharename')
      .eq('userid', userId)

    if (finshareError) throw finshareError

    userFinshares.value = finshareData.map(finshare => ({
      ...finshare,
      selected: finshare.id === selectedFinshareIdFromDB
    }))

    // Fetch finshares where the user is a partner
    const { data: partnerData, error: partnerError } = await supabase
      .from('finsharepartners')
      .select('idfinshare')
      .eq('idpartner', userId)

    if (partnerError) throw partnerError

    if (partnerData && partnerData.length > 0) {
      const partnerFinshareIds = partnerData.map((item) => item.idfinshare)
      const { data: partnerFinsharesData, error: partnerFinsharesError } = await supabase
        .from('finshare')
        .select('id, finsharename')
        .in('id', partnerFinshareIds)

      if (partnerFinsharesError) throw partnerFinsharesError

      sharedFinshares.value = partnerFinsharesData.map(finshare => ({
        ...finshare,
        selected: finshare.id === selectedFinshareIdFromDB
      }))
    }

    // Set the selectedFinshareId
    selectedFinshareId.value = selectedFinshareIdFromDB
  } catch (error) {
    console.error('Error fetching user finshares:', error)
    showSnackbar('Error fetching finshares', 'error')
  }
}

const selectFinshare = (id) => {
  selectedFinshareId.value = id

  // Deselect all other finshares and select only the chosen one
  userFinshares.value.forEach(finshare => {
    finshare.selected = finshare.id === id
  })
  sharedFinshares.value.forEach(finshare => {
    finshare.selected = finshare.id === id
  })
}

const saveSelectedFinshare = async () => {
  if (selectedFinshareId.value) {
    try {
      const { data: userData, error: userError } = await supabase
        .from('perfisusuarios')
        .select('id')
        .eq('userid', (await supabase.auth.getUser()).data.user.id)
        .single()

      if (userError || !userData) {
        throw userError || new Error('User not found in perfisusuarios')
      }

      const { error: updateError } = await supabase
        .from('perfisusuarios')
        .update({ selectedfinshare: selectedFinshareId.value })
        .eq('id', userData.id)

      if (updateError) throw updateError

      showSnackbar('Finshare selected successfully', 'success')
      router.back()
    } catch (error) {
      console.error('Error updating selected finshare:', error)
      showSnackbar('Error updating selected finshare', 'error')
    }
  } else {
    showSnackbar('Please select a finshare', 'warning')
  }
}

const createNewFinshare = () => {
  createDialog.value = true
  newFinshareName.value = ''
}

const confirmCreateNewFinshare = async () => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('perfisusuarios')
      .select('id')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userError || !userData) {
      throw userError || new Error('User not found in perfisusuarios')
    }

    // Create new finshare
    const { data, error } = await supabase
      .from('finshare')
      .insert({
        userid: userData.id,
        finsharename: newFinshareName.value,
        ispublic: false,
      })
      .select()
      .single()

    if (error) throw error

    // Insert default expense groups
    const defaultGroups = [
      { grupodespesa: 'Alimentação', descricaogrupodespesa: 'Despesas com alimentos, supermercado, e refeições fora de casa' },
      { grupodespesa: 'Moradia', descricaogrupodespesa: 'Despesas com aluguel, prestação da casa, condomínio e IPTU' },
      { grupodespesa: 'Transporte', descricaogrupodespesa: 'Despesas com combustível, transporte público e manutenção de veículos' },
      { grupodespesa: 'Educação', descricaogrupodespesa: 'Gastos com escola, faculdade, cursos e materiais escolares' },
      { grupodespesa: 'Saúde', descricaogrupodespesa: 'Despesas com planos de saúde, consultas médicas e medicamentos' },
      { grupodespesa: 'Vestuário', descricaogrupodespesa: 'Despesas com roupas, calçados e acessórios' },
      { grupodespesa: 'Lazer e Entretenimento', descricaogrupodespesa: 'Gastos com passeios, cinema, teatro, e outros entretenimentos' },
      { grupodespesa: 'Assinaturas e Serviços', descricaogrupodespesa: 'Despesas com assinaturas de streaming, clubes e serviços online' },
      { grupodespesa: 'Contas de Água e Energia', descricaogrupodespesa: 'Gastos com água, luz e gás' },
      { grupodespesa: 'Internet e Telefone', descricaogrupodespesa: 'Despesas com internet, telefonia e celular' },
      { grupodespesa: 'Manutenção do Lar', descricaogrupodespesa: 'Gastos com reparos, jardinagem, e itens de manutenção residencial' },
      { grupodespesa: 'Limpeza e Higiene', descricaogrupodespesa: 'Despesas com produtos de limpeza e higiene pessoal' },
      { grupodespesa: 'Cuidados Pessoais', descricaogrupodespesa: 'Despesas com salão, barbearia e cuidados estéticos' },
      { grupodespesa: 'Pets', descricaogrupodespesa: 'Gastos com alimentação, saúde e produtos para pets' },
      { grupodespesa: 'Seguros', descricaogrupodespesa: 'Prêmios de seguro de vida, saúde, carro e residência' },
      { grupodespesa: 'Empréstimos e Financiamentos', descricaogrupodespesa: 'Pagamentos de empréstimos e financiamentos' },
      { grupodespesa: 'Despesas com Filhos', descricaogrupodespesa: 'Gastos específicos com filhos, como babá e atividades extracurriculares' },
      { grupodespesa: 'Viagens', descricaogrupodespesa: 'Despesas com viagens, passagens, hospedagem e turismo' },
      { grupodespesa: 'Investimentos e Poupança', descricaogrupodespesa: 'Aplicações em investimentos e depósitos em poupança' },
      { grupodespesa: 'Doações e Caridade', descricaogrupodespesa: 'Contribuições para causas beneficentes e doações' }
    ]

    const groupsToInsert = defaultGroups.map(group => ({
      ...group,
      finshareid: data.id
    }))

    const { error: groupsError } = await supabase
      .from('grupodespesa')
      .insert(groupsToInsert)

    if (groupsError) throw groupsError

    userFinshares.value.push({
      ...data,
      selected: false
    })
    showSnackbar('New finshare created successfully', 'success')
    createDialog.value = false
  } catch (error) {
    console.error('Error creating finshare:', error)
    showSnackbar('Error creating finshare', 'error')
  }
}

const shareFinshare = async () => {
  if (!selectedShareFinshareId.value) {
    showSnackbar('Please select a finshare to share', 'warning')
    return
  }

  try {
    const { data: partnerData, error: partnerError } = await supabase
      .from('perfisusuarios')
      .select('id')
      .eq('email', partnerEmail.value)
      .single()

    if (partnerError || !partnerData) {
      showSnackbar('User not found', 'error')
      return
    }

    const partnerId = partnerData.id

    const { data: existingData } = await supabase
      .from('finsharepartners')
      .select('*')
      .eq('idfinshare', selectedShareFinshareId.value)
      .eq('idpartner', partnerId)
      .single()

    if (!existingData) {
      const { error: insertError } = await supabase
        .from('finsharepartners')
        .insert({
          idfinshare: selectedShareFinshareId.value,
          idpartner: partnerId,
        })

      if (insertError) throw insertError

      showSnackbar('Finshare shared successfully', 'success')
    } else {
      showSnackbar('User already has access to this finshare', 'info')
    }

    shareDialog.value = false
    partnerEmail.value = ''
    selectedShareFinshareId.value = null
  } catch (error) {
    console.error('Error sharing finshare:', error)
    showSnackbar('Error sharing finshare', 'error')
  }
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}
</script>

<style scoped>
.selected {
  background-color: #e0e0e0;
}
</style>

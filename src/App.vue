<template>
  <v-app id="inspire" theme="light">
    <template v-if="isLoading">
      <v-container fill-height>
        <v-row justify="center" align="center">
          <v-progress-circular indeterminate></v-progress-circular>
        </v-row>
      </v-container>
    </template>
    
    <template v-else>
      <template v-if="isAuthenticated">
        <v-app-bar 
          color="light-green-darken-4" 
          :height="$vuetify.display.xs ? 56 : 64"
          elevation="2"
          fixed
          app
        >
          <v-app-bar-nav-icon variant="text" @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
          <v-toolbar-title class="text-truncate">
            <span class="d-none d-sm-inline">Hórus Financeiro</span>
            <span class="d-sm-none">Hórus</span>
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn 
                icon 
                v-bind="props"
                :size="$vuetify.display.xs ? 'small' : 'default'"
              >
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list :density="$vuetify.display.xs ? 'compact' : 'default'">
              <v-list-item @click="navigateToFinshare">
                <template v-slot:prepend>
                  <v-icon size="small">mdi-wallet</v-icon>
                </template>
                <v-list-item-title>FinShare</v-list-item-title>
              </v-list-item>
              <v-list-item @click="handleLogout">
                <template v-slot:prepend>
                  <v-icon size="small">mdi-logout</v-icon>
                </template>
                <v-list-item-title>Sair</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-app-bar>

        <v-navigation-drawer 
          v-model="drawer" 
          temporary
          :width="$vuetify.display.xs ? '100%' : 256"
          :location="$vuetify.display.xs ? 'top' : 'left'"
          :height="$vuetify.display.xs ? '100vh' : 'auto'"
        >
          <v-list :density="$vuetify.display.xs ? 'compact' : 'default'">
            <v-list-item 
              v-for="item in menuItems" 
              :key="item.title" 
              :prepend-icon="item.icon" 
              :title="item.title" 
              @click="navigateTo(item.to)"
              :active="currentRoute === item.to"
              :class="{ 'px-2': $vuetify.display.xs }"
            ></v-list-item>
            
            <v-list-group 
              value="cadastros"
              v-model="expandedGroup"
              :active="isGroupActive('cadastros')"
            >
              <template v-slot:activator="{ props }">
                <v-list-item
                  v-bind="props"
                  prepend-icon="mdi-folder"
                  title="Cadastros"
                  :class="{ 'px-2': $vuetify.display.xs }"
                ></v-list-item>
              </template>

              <v-list-item 
                v-for="(item, index) in cadastrosItems" 
                :key="index"
                @click="item.action"
                :active="currentRoute === item.route"
                :class="{ 'ps-2': true }"
              >
                <template v-slot:prepend>
                  <v-icon :size="$vuetify.display.xs ? 'small' : 'default'">
                    {{ item.icon }}
                  </v-icon>
                </template>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item>
            </v-list-group>

            <v-list-group 
              value="apropriacoes"
              v-model="expandedGroup"
              :active="isGroupActive('apropriacoes')"
            >
              <template v-slot:activator="{ props }">
                <v-list-item
                  v-bind="props"
                  prepend-icon="mdi-calculator"
                  title="Apropriações"
                  :class="{ 'px-2': $vuetify.display.xs }"
                ></v-list-item>
              </template>

              <v-list-item 
                v-for="(item, index) in apropriacoesItems" 
                :key="index"
                @click="item.action"
                :active="currentRoute === item.route"
                :class="{ 'ps-2': true }"
              >
                <template v-slot:prepend>
                  <v-icon :size="$vuetify.display.xs ? 'small' : 'default'">
                    {{ item.icon }}
                  </v-icon>
                </template>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item>
            </v-list-group>

            <v-list-item 
              prepend-icon="mdi-file-document"
              title="Relatórios"
              @click="navigateToRelatorios"
              :active="currentRoute === '/relatorios'"
              :class="{ 'px-2': $vuetify.display.xs }"
            ></v-list-item>
          </v-list>
        </v-navigation-drawer>

        <v-main style="padding-top: 64px">
          <v-container 
            :class="{
              'pa-2': $vuetify.display.xs,
              'pa-4': !$vuetify.display.xs,
              'mt-2': true
            }" 
            fluid
          >
            <router-view></router-view>
          </v-container>
        </v-main>
      </template>
      
      <template v-else>
        <router-view></router-view>
      </template>
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { supabase } from '@/utils/supabase'

const drawer = ref(false)
const router = useRouter()
const store = useStore()
const route = useRoute()
const expandedGroup = ref(null)
const isLoading = ref(true)

const isAuthenticated = computed(() => store.getters.isAuthenticated)

const menuItems = [
  { title: 'HomeView', icon: 'mdi-home', to: '/HomeView' },
  // Add other menu items as needed
]

const navigateTo = (route) => {
  router.push(route)
  drawer.value = false
}

const navigateToFinshare = () => {
  router.push('/crud_finshare')
}

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await store.dispatch('logout')
    router.push('/')
  } catch (error) {
    console.error('Error during logout:', error)
    // You might want to show an error message to the user here
  }
}

const navigateToContaBancaria = () => {
  router.push('/conta-bancaria')
}

const navigateToCartaoCredito = () => {
  router.push('/cartao-credito')
}

const navigateToGrupoReceita = () => {
  router.push('/grupo-receita')
}

const navigateToGrupoDespesa = () => {
  router.push('/grupo-despesa')
}

const navigateToReceitaForm = () => {
  router.push('/receita-form')
}

const navigateToContasPagar = () => {
  router.push('/contas-pagar')
}

const navigateToAssinaturas = () => {
  router.push('/assinaturas')
}

const navigateToMetas = () => {
  router.push('/metas')
}

const navigateToPagamentos = () => {
  router.push('/pagamentos')
}

const navigateToRelatorios = () => {
  router.push('/relatorios')
}

const currentRoute = computed(() => route.path)

const cadastrosItems = [
  { title: 'Contas Bancárias', icon: 'mdi-bank', action: navigateToContaBancaria, route: '/conta-bancaria' },
  { title: 'Cartões de Crédito', icon: 'mdi-credit-card', action: navigateToCartaoCredito, route: '/cartao-credito' },
  { title: 'Grupos de Receita', icon: 'mdi-cash-plus', action: navigateToGrupoReceita, route: '/grupo-receita' },
  { title: 'Grupos de Despesa', icon: 'mdi-cash-minus', action: navigateToGrupoDespesa, route: '/grupo-despesa' },
  { title: 'Assinaturas', icon: 'mdi-calendar-clock', action: navigateToAssinaturas, route: '/assinaturas' },
  { title: 'Metas Financeiras', icon: 'mdi-target', action: navigateToMetas, route: '/metas' }
]

const apropriacoesItems = [
  { title: 'Apropriar Receitas', icon: 'mdi-cash-register', action: navigateToReceitaForm, route: '/receita-form' },
  { title: 'Contas a Pagar', icon: 'mdi-cash-remove', action: navigateToContasPagar, route: '/contas-pagar' },
  { title: 'Pagamentos', icon: 'mdi-cash-check', action: navigateToPagamentos, route: '/pagamentos' }
]

const isGroupActive = (group) => {
  const routes = {
    cadastros: cadastrosItems.map(item => item.route),
    apropriacoes: apropriacoesItems.map(item => item.route)
  }
  return routes[group].includes(currentRoute.value)
}

// Update expandedGroup when route changes
watch(currentRoute, () => {
  if (isGroupActive('cadastros')) {
    expandedGroup.value = 'cadastros'
  } else if (isGroupActive('apropriacoes')) {
    expandedGroup.value = 'apropriacoes'
  }
}, { immediate: true })

onMounted(async () => {
  try {
    await store.dispatch('initializeAuth');
  } finally {
    isLoading.value = false;
  }
})
</script>

<style scoped>
.content-behind-drawer {
  padding-bottom: 56px;
}

/* Adjustments for xs */
@media (max-width: 600px) {
  :deep(.v-list-group__items .v-list-item) {
    padding-left: 4px !important;
  }

  :deep(.v-list-group__items) {
    margin-left: 4px !important;
    border-left: thin solid rgba(0, 0, 0, 0.12);
  }

  :deep(.v-toolbar-title) {
    font-size: 1.25rem;
  }

  :deep(.v-list-item) {
    min-height: 40px;
  }

  :deep(.v-list-group__header) {
    min-height: 40px;
  }

  :deep(.v-btn--icon) {
    width: 32px;
    height: 32px;
  }
}

/* Global adjustments for menu subitems */
:deep(.v-list-group__items .v-list-item) {
  padding-left: 4px !important;
}

:deep(.v-list-group__items) {
  margin-left: 4px !important;
  border-left: thin solid rgba(0, 0, 0, 0.12);
}

:deep(.v-list-group--prepend) {
  margin-left: 0 !important;
}

:deep(.v-list-item--active) {
  background-color: rgb(var(--v-theme-primary), 0.1);
}

/* Adicione estas regras para garantir o comportamento fixo da app-bar */
:deep(.v-app-bar) {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

@media (max-width: 600px) {
  :deep(.v-main) {
    padding-top: 56px !important;
  }
}
</style>

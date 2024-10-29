import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginForm from '../views/LoginForm.vue'
import RegisterForm from '../views/RegisterForm.vue'
import CrudFinshare from '../views/crud_finshare.vue'
import { supabase } from '@/utils/supabase'
import ContaBancaria from '../views/ContaBancaria.vue'
import CartaoCredito from '../views/CartaoCredito.vue'
import GrupoReceita from '../views/GrupoReceita.vue'
import GrupoDespesa from '../views/GrupoDespesa.vue'
import ReceitaForm from '../views/ReceitaForm.vue'
import TesteRecursos from '../views/TesteRecursos.vue'
import ContasPagar from '../views/ContasPagar.vue'
import AssinaturasForm from '../views/AssinaturasForm.vue'
import PagamentosForm from '../views/PagamentosForm.vue'
import MetasForm from '../views/MetasForm.vue'
import RelatoriosImports from '../views/RelatoriosImports.vue'

const routes = [
  {
    path: '/',
    name: 'LoginForm',
    component: LoginForm
  },
  {
    path: '/HomeView',
    name: 'HomeView',
    component: HomeView,
    meta: { requiresAuth: true }
  },
  {
    path: '/RegisterForm',
    name: 'RegisterForm',
    component: RegisterForm
  },
  {
    path: '/crud_finshare',
    name: 'crud_finshare',
    component: CrudFinshare,
    meta: { requiresAuth: true }
  },
  {
    path: '/conta-bancaria',
    name: 'ContaBancaria',
    component: ContaBancaria,
    meta: { requiresAuth: true }
  },
  {
    path: '/cartao-credito',
    name: 'CartaoCredito',
    component: CartaoCredito,
    meta: { requiresAuth: true }
  },
  {
    path: '/grupo-receita',
    name: 'GrupoReceita',
    component: GrupoReceita,
    meta: { requiresAuth: true }
  },
  {
    path: '/grupo-despesa',
    name: 'GrupoDespesa',
    component: GrupoDespesa,
    meta: { requiresAuth: true }
  },
  {
    path: '/receita-form',
    name: 'ReceitaForm',
    component: ReceitaForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/teste-recursos',
    name: 'TesteRecursos',
    component: TesteRecursos,
    meta: { requiresAuth: true }
  },
  {
    path: '/contas-pagar',
    name: 'ContasPagar',
    component: ContasPagar,
    meta: { requiresAuth: true }
  },
  {
    path: '/assinaturas',
    name: 'AssinaturasForm',
    component: AssinaturasForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/pagamentos',
    name: 'PagamentosForm',
    component: PagamentosForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/metas',
    name: 'MetasForm',
    component: MetasForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/relatorios',
    name: 'RelatoriosImports',
    component: RelatoriosImports,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (to.meta.requiresAuth && !session) {
    next({ name: 'LoginForm' })
  } else if (to.name === 'LoginForm' && session) {
    next({ name: 'HomeView' })
  } else {
    next()
  }
})

export default router

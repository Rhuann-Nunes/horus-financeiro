import { createStore } from 'vuex'
import { supabase } from '@/utils/supabase'

export default createStore({
  state: {
    session: null
  },
  getters: {
    isAuthenticated: (state) => !!state.session
  },
  mutations: {
    setSession(state, session) {
      state.session = session
    }
  },
  actions: {
    async fetchSession({ commit }) {
      const { data: { session } } = await supabase.auth.getSession()
      commit('setSession', session)
    }
  }
})

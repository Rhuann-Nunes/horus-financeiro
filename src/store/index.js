import { createStore } from 'vuex'
import { supabase } from '@/utils/supabase'

export default createStore({
  state: {
    session: null,
    user: null,
    selectedFinshare: null,
    loading: false,
    error: null
  },

  getters: {
    isAuthenticated: (state) => !!state.session,
    currentUser: (state) => state.user,
    selectedFinshare: (state) => state.selectedFinshare,
    isLoading: (state) => state.loading,
    error: (state) => state.error
  },

  mutations: {
    SET_SESSION(state, session) {
      state.session = session
    },
    SET_USER(state, user) {
      state.user = user
    },
    SET_SELECTED_FINSHARE(state, finshare) {
      state.selectedFinshare = finshare
    },
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    CLEAR_ERROR(state) {
      state.error = null
    }
  },

  actions: {
    async initializeAuth({ dispatch }) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await dispatch('fetchSession')
          await dispatch('fetchUserProfile')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      }
    },

    async fetchSession({ commit }) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        commit('SET_SESSION', session)
        return session
      } catch (error) {
        commit('SET_ERROR', error.message)
        return null
      }
    },

    async fetchUserProfile({ commit, state }) {
      if (!state.session?.user?.id) return null

      try {
        const { data, error } = await supabase
          .from('perfisusuarios')
          .select('*')
          .eq('userid', state.session.user.id)
          .single()

        if (error) throw error
        commit('SET_USER', data)
        commit('SET_SELECTED_FINSHARE', data.selectedfinshare)
        return data
      } catch (error) {
        commit('SET_ERROR', error.message)
        return null
      }
    },

    async login({ commit, dispatch }, { email, password }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) throw error

        commit('SET_SESSION', data.session)
        await dispatch('fetchUserProfile')
        return { success: true }
      } catch (error) {
        commit('SET_ERROR', error.message)
        return { success: false, error: error.message }
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async logout({ commit }) {
      try {
        await supabase.auth.signOut()
        commit('SET_SESSION', null)
        commit('SET_USER', null)
        commit('SET_SELECTED_FINSHARE', null)
        return { success: true }
      } catch (error) {
        commit('SET_ERROR', error.message)
        return { success: false, error: error.message }
      }
    },

    async updateSelectedFinshare({ commit, state }, finshareId) {
      if (!state.user?.id) return { success: false, error: 'User not authenticated' }

      try {
        const { error } = await supabase
          .from('perfisusuarios')
          .update({ selectedfinshare: finshareId })
          .eq('id', state.user.id)

        if (error) throw error

        commit('SET_SELECTED_FINSHARE', finshareId)
        return { success: true }
      } catch (error) {
        commit('SET_ERROR', error.message)
        return { success: false, error: error.message }
      }
    }
  }
})

<template>
  <login-form @auth-success="handleAuthSuccess" />
</template>

<script setup>
import LoginForm from '@/components/auth/LoginForm.vue'
import { useRouter } from 'vue-router'
import { defineComponent } from 'vue'

defineComponent({
  name: 'LoginPage'
})

const router = useRouter()

const handleAuthSuccess = () => {
  router.push('/HomeView')
}
</script> 
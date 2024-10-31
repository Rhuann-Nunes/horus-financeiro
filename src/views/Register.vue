<template>
  <register-form @auth-success="handleAuthSuccess" />
</template>

<script setup>
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { useRouter } from 'vue-router'
import { defineComponent } from 'vue'

defineComponent({
  name: 'RegisterPage'
})

const router = useRouter()

const handleAuthSuccess = () => {
  router.push('/')
}
</script> 
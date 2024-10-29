<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Login</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="email"
                label="Email"
                name="email"
                prepend-icon="mdi-email"
                type="email"
                required
              ></v-text-field>
              <v-text-field
                v-model="password"
                label="Password"
                name="password"
                prepend-icon="mdi-lock"
                type="password"
                required
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="handleLogin" :loading="loading">
              Login
            </v-btn>
          </v-card-actions>
          <v-card-text class="text-center">
            Don't have an account?
            <a @click.prevent="goToRegister" href="#" class="black--text">Register</a>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/utils/supabase';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

onMounted(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/HomeView');
    }
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
  }
});


const handleLogin = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        showSnackbar('Usuário não registrado na base Hórus', 'error');
      } else {
        showSnackbar(error.message, 'error');
      }
    } else if (data.user) {
      showSnackbar('Login successful', 'success');
      setTimeout(() => {
        router.push('/HomeView');
      }, 1500);
    }
  } catch (error) {
    showSnackbar('An unexpected error occurred', 'error');
  } finally {
    loading.value = false;
  }
};

const goToRegister = () => {
  router.push('/RegisterForm');
};

const showSnackbar = (text, color) => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script>

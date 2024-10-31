<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Register</v-toolbar-title>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleRegister">
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
              <v-text-field
                v-model="confirmPassword"
                label="Confirm Password"
                name="confirmPassword"
                prepend-icon="mdi-lock-check"
                type="password"
                required
              ></v-text-field>
              <v-text-field
                v-model="username"
                label="Nome"
                name="username"
                prepend-icon="mdi-account"
                required
              ></v-text-field>
              <v-text-field
                v-model="telefone"
                label="Telefone"
                name="telefone"
                prepend-icon="mdi-phone"
                required
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="handleRegister" :loading="loading">
              Register
            </v-btn>
          </v-card-actions>
          <v-card-text class="text-center">
            Already have an account?
            <a @click.prevent="goToLogin" href="#" class="black--text">Login</a>
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
import { ref, defineEmits } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/utils/supabase';

const emit = defineEmits(['auth-success']);
const router = useRouter();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const username = ref('');
const telefone = ref('');
const loading = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('');

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    showSnackbar('Passwords do not match', 'error');
    return;
  }
  loading.value = true;
  try {
    // Register the user
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });

    if (error) {
      showSnackbar(error.message, 'error');
    } else if (data.user) {
      // Insert additional information into perfisusuarios table
      const { data: perfilData, error: insertError } = await supabase
        .from('perfisusuarios')
        .insert({
          userid: data.user.id,
          email: email.value,
          telefone: telefone.value,
          username: username.value,
        })
        .select()
        .single();

      if (insertError) {
        showSnackbar('Error saving additional information', 'error');
      } else if (perfilData) {
        // Create initial finshare and update selected finshare
        await createInitialFinshareAndUpdateSelection(perfilData.id);
        
        showSnackbar('Registration successful. Please check your email.', 'success');
        emit('auth-success');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    }
  } catch (error) {
    showSnackbar('An unexpected error occurred', 'error');
  } finally {
    loading.value = false;
  }
};

const createInitialFinshareAndUpdateSelection = async (userId) => {
  try {
    // Create the initial finshare
    const { data: finshareData, error: createError } = await supabase
      .from('finshare')
      .insert({
        userid: userId,
        finsharename: `Ambiente Inicial`,
        ispublic: false,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

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
    ];

    const groupsToInsert = defaultGroups.map(group => ({
      ...group,
      finshareid: finshareData.id
    }));

    const { error: groupsError } = await supabase
      .from('grupodespesa')
      .insert(groupsToInsert);

    if (groupsError) {
      throw groupsError;
    }

    // Update the selectedfinshare column in perfisusuarios
    const { error: updateError } = await supabase
      .from('perfisusuarios')
      .update({ selectedfinshare: finshareData.id })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error('Error in creating and selecting initial finshare:', error);
    showSnackbar('Error creating initial finshare', 'error');
  }
};

const goToLogin = () => {
  router.push('/');
};

const showSnackbar = (text, color) => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};
</script> 
<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="primary" dark flat>
            <v-toolbar-title>Teste de Recursos</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon @click="toggleCamera">
              <v-icon>{{ isCameraActive ? 'mdi-camera-off' : 'mdi-camera' }}</v-icon>
            </v-btn>
            <v-btn icon @click="$refs.fileInput.click()">
              <v-icon>mdi-image</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="handleSubmit">
              <v-text-field
                v-model="barcode"
                label="Código de Barras"
                required
                :readonly="isCameraActive"
              ></v-text-field>
              <div v-show="isCameraActive" id="camera" ref="cameraContainer"></div>
              <div v-if="selectedImage" class="mt-3">
                <img :src="selectedImage" alt="Selected Image" style="max-width: 100%; max-height: 320px;" />
              </div>
              <v-textarea
                v-model="ocrExtractedText"
                label="Texto Extraído (OCR)"
                readonly
                rows="5"
                class="mt-3"
              ></v-textarea>
              <v-textarea
                v-model="chatGPTResponse"
                label="Resposta do ChatGPT"
                readonly
                rows="5"
                class="mt-3"
              ></v-textarea>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="handleSubmit" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <input
    type="file"
    ref="fileInput"
    accept="image/*"
    style="display: none"
    @change="onFileSelected"
  />
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import Quagga from 'quagga';
import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';

const barcode = ref('');
const loading = ref(false);
const isCameraActive = ref(false);
const cameraContainer = ref(null);
const selectedImage = ref(null);
const ocrExtractedText = ref('');
const chatGPTResponse = ref('');

const toggleCamera = () => {
  if (isCameraActive.value) {
    stopCamera();
  } else {
    startCamera();
  }
};

const startCamera = () => {
  Quagga.init(
    {
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: cameraContainer.value,
        constraints: {
          width: 480,
          height: 320,
          facingMode: 'environment',
        },
      },
      decoder: {
        readers: ['ean_reader', 'ean_8_reader', 'code_128_reader'],
      },
    },
    (err) => {
      if (err) {
        console.error('Failed to initialize camera:', err);
        return;
      }
      Quagga.start();
      isCameraActive.value = true;
    }
  );

  Quagga.onDetected((result) => {
    barcode.value = result.codeResult.code;
    const canvas = Quagga.canvas.dom.image;
    selectedImage.value = canvas.toDataURL();
    performOCR(selectedImage.value);
    stopCamera();
  });
};

const stopCamera = () => {
  Quagga.stop();
  isCameraActive.value = false;
};

const handleSubmit = () => {
  loading.value = true;
  // Simulate API call
  setTimeout(() => {
    console.log('Submitted barcode:', barcode.value);
    loading.value = false;
    barcode.value = '';
    selectedImage.value = null;
  }, 1000);
};

const onFileSelected = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedImage.value = e.target.result;
      performOCR(e.target.result);
    };
    reader.readAsDataURL(file);
  }
};

const performOCR = async (imageData) => {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(imageData);
  await worker.terminate();

  console.log('Resultado do OCR:', text); // Adicione esta linha

  ocrExtractedText.value = text;

  const respostaGPT = await consultarChatGPT(text);
  chatGPTResponse.value = respostaGPT;
};

const consultarChatGPT = async (textoCupom) => {
  const apiKey = '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';

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  try {
    console.log('Iniciando chamada para OpenAI');
    console.log('Texto do cupom:', textoCupom);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Mudando para gpt-3.5-turbo para teste
      messages: [
        {
          role: 'user',
          content: `
          Extraia as seguintes informações do texto do cupom fiscal fornecido:
          
          - IsCredit: Sim ou Não (se a compra foi no crédito)
          - Valor Total: o valor total da compra
          - Grupo: um dos grupos principais: Moradia, Alimentação, Transporte, Educação, Saúde e Bem-Estar, Comunicação e Internet, Vestuário e Cuidados Pessoais, Lazer e Cultura, Seguros e Previdência, Dívidas e Investimentos, Impostos e Taxas.
          
          Responda exatamente neste formato:
          
          IsCredit: [Sim/Não ou "Erro"]
          Valor total: [valor total ou "Erro"]
          Grupo: [grupo correspondente ou "Erro"]
          
          Texto do cupom:
          ${textoCupom}
          `,
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    console.log('Resposta da OpenAI:', response);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erro detalhado ao extrair dados do cupom:", error);
    if (error instanceof Error) {
      return `Erro ao processar cupom: ${error.name} - ${error.message}`;
    } else {
      return "Erro desconhecido ao processar cupom";
    }
  }
};

onUnmounted(() => {
  if (isCameraActive.value) {
    stopCamera();
  }
});
</script>

<style scoped>
#camera {
  width: 100%;
  max-width: 480px;
  height: 320px;
  margin: 0 auto;
  border: 1px solid #ccc;
  overflow: hidden;
}
</style>

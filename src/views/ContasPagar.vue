<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-toolbar color="black" dark flat>
            <v-toolbar-title>Despesas</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon @click="toggleCamera">
              <v-icon>{{ isCameraActive ? 'mdi-camera-off' : 'mdi-camera' }}</v-icon>
            </v-btn>
            <v-btn icon @click="$refs.fileInput.click()">
              <v-icon>mdi-image</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-form @submit.prevent="saveContaPagar">
              <v-select
                v-model="tipoDespesa"
                :items="tiposDespesa"
                label="Tipo de despesa"
                required
              ></v-select>
              <v-autocomplete
                v-model="grupoDespesa"
                :items="gruposDespesa"
                label="Grupo de despesa"
                item-value="id"
                item-title="grupodespesa"
                required
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.grupodespesa"></v-list-item>
                </template>
              </v-autocomplete>
              <v-autocomplete
                v-model="contaBancaria"
                :items="contasBancarias"
                label="Conta Bancária"
                item-value="id"
                item-title="descricao"
                required
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.descricao"></v-list-item>
                </template>
              </v-autocomplete>
              <v-autocomplete
                v-if="tipoDespesa === 'Credito'"
                v-model="cartaoCredito"
                :items="cartoesCredito"
                label="Cartão de Crédito"
                item-value="id"
                item-title="nome"
                required
              >
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :title="item.raw.nome"></v-list-item>
                </template>
              </v-autocomplete>
              <v-text-field
                v-model="numeroParcelas"
                label="Número de Parcelas"
                type="number"
                min="1"
                required
              ></v-text-field>
              <v-text-field
                v-model="dataDespesa"
                label="Data da Despesa"
                type="date"
                required
              ></v-text-field>
              <v-text-field
                v-model="valorTotal"
                label="Valor Total"
                type="number"
                step="0.01"
                required
              ></v-text-field>
              <v-select
                v-model="status"
                :items="['Pago', 'A pagar']"
                label="Status"
                required
              ></v-select>
              <v-file-input
                v-model="comprovante"
                label="Comprovante"
                accept="image/*"
                prepend-icon="mdi-camera"
              ></v-file-input>
              <v-text-field
                v-model="linhaDigitavel"
                label="Linha Digitável / PIX / Informações de Pagamento"
              ></v-text-field>
              <v-text-field
                v-model="observacoes"
                label="Observações"
                multiline
                rows="3"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="black" @click="saveContaPagar" :loading="loading">
              Salvar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      style="display: none"
      @change="onFileSelected"
    />

    <div v-show="isCameraActive" id="camera" ref="cameraContainer"></div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { createWorker } from 'tesseract.js'
import Quagga from 'quagga'
import OpenAI from 'openai'

const tipoDespesa = ref('')
const grupoDespesa = ref(null)
const contaBancaria = ref(null)
const cartaoCredito = ref(null)
const numeroParcelas = ref(1)
const dataDespesa = ref(new Date().toISOString().split('T')[0])
const valorTotal = ref('')
const status = ref('')
const comprovante = ref(null)
const linhaDigitavel = ref('')
const observacoes = ref('')

const tiposDespesa = ['Debito', 'Credito', 'Empréstimo', 'Financiamento', 'TED', 'DOC', 'PIX', 'Dinheiro']
const gruposDespesa = ref([])
const contasBancarias = ref([])
const cartoesCredito = ref([])

const loading = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('')

const isCameraActive = ref(false)
const cameraContainer = ref(null)
const fileInput = ref(null)

onMounted(async () => {
  await fetchGruposDespesa()
  await fetchContasBancarias()
})

watch(contaBancaria, async (newValue) => {
  if (newValue) {
    await fetchCartoesCredito()
  } else {
    cartoesCredito.value = []
  }
})

const fetchGruposDespesa = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data, error } = await supabase
        .from('grupodespesa')
        .select('id, grupodespesa')
        .eq('finshareid', userData.selectedfinshare)

      if (error) throw error
      gruposDespesa.value = data
    }
  } catch (error) {
    console.error('Error fetching grupos despesa:', error)
    showSnackbar('Erro ao buscar grupos de despesa', 'error', error)
  }
}

const fetchContasBancarias = async () => {
  try {
    const { data: userData } = await supabase
      .from('perfisusuarios')
      .select('selectedfinshare')
      .eq('userid', (await supabase.auth.getUser()).data.user.id)
      .single()

    if (userData?.selectedfinshare) {
      const { data, error } = await supabase
        .from('contabancaria')
        .select('id, banco, conta, agencia')
        .eq('finshareid', userData.selectedfinshare)

      if (error) throw error
      contasBancarias.value = data.map(conta => ({
        id: conta.id,
        descricao: `${conta.banco} - Conta: ${conta.conta} - Agência: ${conta.agencia}`
      }))
    }
  } catch (error) {
    console.error('Error fetching contas bancarias:', error)
    showSnackbar('Erro ao buscar contas bancárias', 'error', error)
  }
}

const fetchCartoesCredito = async () => {
  try {
    if (!contaBancaria.value) return;

    const { data, error } = await supabase
      .from('cartaocredito')
      .select('id, banco, quatro_ultimos_digitos, apelido, limite')
      .eq('id_conta', contaBancaria.value)

    if (error) throw error
    cartoesCredito.value = data.map(cartao => ({
      id: cartao.id,
      nome: `${cartao.banco} - ${cartao.apelido} (${cartao.quatro_ultimos_digitos})`
    }))
  } catch (error) {
    console.error('Error fetching cartes de crédito:', error)
    showSnackbar('Erro ao buscar cartões de crédito', 'error', error)
  }
}

const saveContaPagar = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData, error: userError } = await supabase
      .from('perfisusuarios')
      .select('id, selectedfinshare')
      .eq('userid', user.id)
      .single()

    if (userError) throw userError

    // Buscar o maior iddespesa atual
    const { data: maxIdDespesaData, error: maxIdDespesaError } = await supabase
      .from('contaspagar')
      .select('iddespesa')
      .order('iddespesa', { ascending: false })
      .limit(1)

    if (maxIdDespesaError) {
      console.error('Max ID Despesa error:', maxIdDespesaError)
      throw maxIdDespesaError
    }

    let newIdDespesa = 1
    if (maxIdDespesaData && maxIdDespesaData.length > 0) {
      newIdDespesa = (maxIdDespesaData[0]?.iddespesa || 0) + 1
    }

    let comprovanteUrl = ''
    if (comprovante.value) {
      const file = comprovante.value
      const fileExtension = file.name.split('.').pop()
      const filePath = `${userData.selectedfinshare}/comprovante_id_${newIdDespesa}.${fileExtension}`
      const { error: uploadError } = await supabase.storage
        .from('Comprovantes')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Error uploading file: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from('Comprovantes')
        .getPublicUrl(filePath)

      comprovanteUrl = publicUrlData.publicUrl
    }

    const valorParcela = parseFloat(valorTotal.value) / numeroParcelas.value

    for (let i = 0; i < numeroParcelas.value; i++) {
      let dataParcela

      if (tipoDespesa.value === 'Credito') {
        const { data: cartaoData, error: cartaoError } = await supabase
          .from('cartaocredito')
          .select('datafechamento, datavencimento')
          .eq('id', cartaoCredito.value)
          .single()

        if (cartaoError) {
          console.error('Cartão error:', cartaoError)
          throw cartaoError
        }

        dataParcela = calculateCreditCardDueDate(
          dataDespesa.value,
          cartaoData.datafechamento,
          cartaoData.datavencimento
        )
      } else {
        // Para outros tipos de despesa, apenas adicione os meses
        const [ano, mes, dia] = dataDespesa.value.split('-')
        let parcelaAno = parseInt(ano)
        let parcelaMes = parseInt(mes) + i
        
        while (parcelaMes > 12) {
          parcelaMes -= 12
          parcelaAno++
        }
        
        const parcelaMesStr = parcelaMes.toString().padStart(2, '0')
        dataParcela = `${parcelaAno}-${parcelaMesStr}-${dia}`
      }

      const newContaPagar = {
        tipodespesa: tipoDespesa.value,
        iddespesa: newIdDespesa,
        idgrupodespesa: grupoDespesa.value,
        idusuariocadastro: userData.id,
        idfinshare: userData.selectedfinshare,
        idcontabacaria: contaBancaria.value,
        idcartaocredito: tipoDespesa.value === 'Credito' ? cartaoCredito.value : null,
        numeroparcelas: numeroParcelas.value,
        parcela: i + 1,
        datadespesa: dataDespesa.value,
        dataparcela: dataParcela,
        valor: valorParcela,
        comprovante: comprovanteUrl,
        linhaboleto: linhaDigitavel.value,
        status: status.value,
        observacoes: observacoes.value
      }

      console.log('Inserting conta a pagar:', newContaPagar)

      const { data: insertedData, error: insertError } = await supabase
        .from('contaspagar')
        .insert(newContaPagar)
        .select()
        .single()

      if (insertError) {
        console.error('Insert error details:', insertError)
        throw new Error(`Error inserting conta a pagar: ${insertError.message}`)
      }

      console.log('Inserted data:', insertedData)

      if (status.value === 'Pago' && i === 0) {
        const { error: pagamentoError } = await supabase.from('contaspagas').insert({
          idcontaapagar: insertedData.id,
          valor: valorParcela,
          datapagamento: new Date().toISOString().substr(0, 10),
          comprovante: comprovanteUrl,
          idfinshare: userData.selectedfinshare
        })

        if (pagamentoError) {
          console.error('Pagamento error:', pagamentoError)
          throw new Error(`Error inserting conta paga: ${pagamentoError.message}`)
        }
      }
    }

    showSnackbar('Conta a pagar cadastrada com sucesso', 'success')
    resetForm()
  } catch (error) {
    console.error('Error saving conta a pagar:', error)
    showSnackbar(`Erro ao salvar conta a pagar: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  tipoDespesa.value = ''
  grupoDespesa.value = null
  contaBancaria.value = null
  cartaoCredito.value = null
  numeroParcelas.value = 1
  dataDespesa.value = new Date().toISOString().split('T')[0]
  valorTotal.value = ''
  status.value = ''
  comprovante.value = null
  linhaDigitavel.value = ''
  observacoes.value = ''
}

const showSnackbar = (text, color, error = null) => {
  snackbarText.value = text
  snackbarColor.value = color
  if (error) {
    console.error('Error details:', error)
  }
  snackbar.value = true
}

const toggleCamera = () => {
  if (isCameraActive.value) {
    stopCamera()
  } else {
    startCamera()
  }
}

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
        console.error('Failed to initialize camera:', err)
        return
      }
      Quagga.start()
      isCameraActive.value = true
    }
  )

  Quagga.onDetected(async (result) => {
    if (result && result.codeResult) {
      const canvas = Quagga.canvas.dom.image
      const imageData = canvas.toDataURL()
      await processImage(imageData)
      stopCamera()
    }
  })
}

const stopCamera = () => {
  if (isCameraActive.value) {
    Quagga.stop()
    isCameraActive.value = false
  }
}

const onFileSelected = async (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      await processImage(e.target.result)
    }
    reader.readAsDataURL(file)
  }
}

const processImage = async (imageData) => {
  try {
    loading.value = true
    showSnackbar('Processando imagem...', 'info')

    // Perform OCR
    const worker = await createWorker('por')
    const { data: { text } } = await worker.recognize(imageData)
    await worker.terminate()

    if (!text) {
      throw new Error('Não foi possível extrair texto da imagem')
    }

    showSnackbar('Analisando texto com GPT...', 'info')
    const analysis = await analyzeReceiptWithGPT(text)
    
    if (!analysis) {
      throw new Error('Não foi possível analisar o texto com GPT')
    }

    updateFormFields(analysis)
    
    // Save the image data for the comprovante
    comprovante.value = dataURLtoFile(imageData, 'comprovante.png')
    
    showSnackbar('Imagem processada com sucesso!', 'success')
  } catch (error) {
    console.error('Error processing image:', error)
    showSnackbar(`Erro ao processar imagem: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

const analyzeReceiptWithGPT = async (text) => {
  const openai = new OpenAI({
    apiKey: process.env.VUE_APP_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  })

  try {
    const gruposList = gruposDespesa.value.map(g => g.grupodespesa).join(', ')
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em análise de comprovantes fiscais brasileiros. 
          Você deve analisar detalhadamente comprovantes identificando informações importantes como:
          - Data e hora da compra
          - Itens comprados (quando possível)
          - Forma de pagamento (especialmente se for crédito parcelado)
          - Estabelecimento
          - Outras informações relevantes`
        },
        {
          role: 'user',
          content: `
          Analise este texto de comprovante fiscal e extraia:
          
          - Tipo de despesa (DEVE ser um destes: ${tiposDespesa.join(', ')})
          - Grupo de despesa (DEVE ser um destes: ${gruposList})
          - Valor total (apenas o número, sem R$ ou outros caracteres)
          - Observações (elabore uma descrição detalhada incluindo:
            * Data e hora da compra (se disponível)
            * Local/estabelecimento
            * Itens principais comprados (se identificáveis)
            * Se foi parcelado, em quantas vezes
            * Outras informações relevantes encontradas
          )
          
          Se não encontrar alguma informação, retorne "null" para o campo.
          
          Responda EXATAMENTE neste formato:
          tipo: [tipo encontrado ou null]
          grupo: [grupo encontrado ou null]
          valor: [valor encontrado ou null]
          observacoes: [descrição detalhada conforme solicitado ou null]
          
          Texto do comprovante:
          ${text}
          `
        }
      ],
      temperature: 0.4,
    })

    return parseGPTResponse(response.choices[0].message.content)
  } catch (error) {
    console.error('Error calling GPT:', error)
    throw new Error('Erro ao analisar com GPT: ' + error.message)
  }
}

const parseGPTResponse = (response) => {
  const lines = response.split('\n')
  const result = {}
  
  lines.forEach(line => {
    const [key, value] = line.split(':').map(s => s.trim())
    result[key] = value
  })
  
  return result
}

const updateFormFields = (analysis) => {
  if (analysis.tipo && analysis.tipo !== 'null') {
    tipoDespesa.value = analysis.tipo
  }
  
  if (analysis.grupo && analysis.grupo !== 'null') {
    const grupoFound = gruposDespesa.value.find(
      g => g.grupodespesa.toLowerCase() === analysis.grupo.toLowerCase()
    )
    if (grupoFound) {
      grupoDespesa.value = grupoFound.id
    }
  }
  
  if (analysis.valor && analysis.valor !== 'null') {
    valorTotal.value = analysis.valor
  }
  
  if (analysis.observacoes && analysis.observacoes !== 'null') {
    observacoes.value = analysis.observacoes
  }
}

const dataURLtoFile = (dataurl, filename) => {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

const calculateCreditCardDueDate = (purchaseDate, closingDay, dueDay) => {
  const [year, month, day] = purchaseDate.split('-').map(Number)
  let dueMonth = month
  let dueYear = year

  if (day > closingDay) {
    // If purchase is after closing date, payment is due two cycles ahead
    dueMonth += 2
  } else {
    // If purchase is before or on closing date, payment is due next cycle
    dueMonth += 1
  }

  // Adjust year if needed
  while (dueMonth > 12) {
    dueMonth -= 12
    dueYear++
  }

  return `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`
}

// Add cleanup on component unmount
onUnmounted(() => {
  if (isCameraActive.value) {
    stopCamera()
  }
})
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


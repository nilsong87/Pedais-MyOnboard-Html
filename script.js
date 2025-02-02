// --- Configurações Iniciais ---
const availablePedals = []; // Array para armazenar os pedais disponíveis
const selectedPedals = []; // Array para armazenar os pedais selecionados pelo usuário
const maxPedals = 8; // Número máximo de pedais que o usuário pode selecionar

let audioContext = null;
let inputNode = null;
let outputNode = null;
let selectedInputDeviceId = null;
let selectedOutputDeviceId = null;
let ampNode = null;

// --- Metrônomo ---
const metronome = new Tone.Sampler({
    urls: {
        "C1": "audio/metronome-click.wav"
    },
    onload: () => {
        console.log("Som do metrônomo carregado!");
    }
}).toDestination();

let metronomeIntervalId;
let isMetronomeRunning = false;

function startMetronome() {
  if (isMetronomeRunning) return; // Evita iniciar múltiplos metrônomos

  const bpm = parseInt(document.getElementById('bpm').value);
  const interval = 60 / bpm;

  // Inicia o Tone.Transport para controlar o tempo
  Tone.Transport.start();

  // Agenda o som do metrônomo para tocar em loop
  metronomeIntervalId = Tone.Transport.scheduleRepeat((time) => {
    metronome.triggerAttackRelease("C1", "8n", time);
  }, interval);

  isMetronomeRunning = true;
  document.getElementById('startMetronome').textContent = '⏸️';
}

function stopMetronome() {
  // Para o agendamento do metrônomo
  Tone.Transport.clear(metronomeIntervalId);
  metronomeIntervalId = null; // Limpa o ID do intervalo

  // Para o Tone.Transport
  Tone.Transport.stop();

  isMetronomeRunning = false;
  document.getElementById('startMetronome').textContent = '▶️';
}

// --- Afinador ---

const tuner = new Tone.Analyser('waveform', 1024);
let tunerStream = null;

// Conecte a saída do amplificador ao analisador do afinador
if (ampNode) {
    ampNode.connect(tuner);
} else {
    console.warn("ampNode não está definido. O afinador pode não funcionar corretamente.");
}

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const tunings = {
  "EADGBE": [82.41, 110.00, 146.83, 196.00, 246.94, 329.63], // Standard
  "D#G#C#F#A#D#": [77.78, 103.83, 138.59, 185.00, 233.08, 311.13], // Eb Standard
  "C#G#C#F#A#D#": [69.30, 103.83, 138.59, 185.00, 233.08, 311.13],// Drop C#
  "DGCFAD": [73.42, 98.00, 130.81, 174.61, 220.00, 293.66], // Drop D
  "CGCFAD": [65.41, 98.00, 130.81, 174.61, 220.00, 293.66], // Drop C
  "C#F#BEG#C#": [69.30, 92.50, 123.47, 174.61, 207.65, 277.18],// Open C#
  "BF#BEG#C#": [61.74, 92.50, 123.47, 174.61, 207.65, 277.18] // Open B
};

let selectedTuning = "EADGBE"; // Afinação padrão

async function startTuner() {
    if (tunerStream) {
        // Se o afinador já estiver rodando, apenas retorna
        return;
    }
    const tunerOutput = document.getElementById('tuner-output');
    try {
        // Pede acesso ao microfone do usuário
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Verifica se o contexto de áudio já foi criado
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Cria um MediaStreamAudioSourceNode para o stream de áudio
        tunerStream = audioContext.createMediaStreamSource(stream);

        // Conecta o stream de áudio ao analisador
        tunerStream.connect(tuner);

        // Inicia a atualização da interface do afinador
        setInterval(() => {
            const frequency = getFundamentalFrequency(tuner.getValue(), audioContext.sampleRate);
            if (frequency) {
                const note = getNoteFromFrequency(frequency);
                const detune = getDetune(frequency, note);
                tunerOutput.innerHTML = `Nota: ${noteStrings[note % 12]} - Detune: ${detune.toFixed(2)} cents`;
            }
        }, 100);
    } catch (err) {
        console.error('Erro ao acessar o microfone:', err);
        tunerOutput.innerHTML = 'Erro ao acessar o microfone.';
    }
}

function stopTuner() {
    if (tunerStream) {
        tunerStream.disconnect(tuner);
        tunerStream = null; // Define tunerStream como null para indicar que o afinador foi parado
    }
}

function getNoteFromFrequency(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function getDetune(freq, note) {
  const minFreq = 440 * Math.pow(2, (note - 69) / 12);
  const maxFreq = 440 * Math.pow(2, (note - 68) / 12);
  return Math.floor(1200 * Math.log(freq / minFreq) / Math.log(2));
}

function getFundamentalFrequency(buffer, sampleRate) {
  let SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }

  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) {
    return null;
  }

  let r1 = 0, r2 = SIZE - 1, threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  buffer = buffer.subarray(r1, r2);
  SIZE = buffer.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) {
    d++;
  }

  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  return sampleRate / T0;
}

// --- Gravação ---

let recorder;
let recording = false;

function initializeRecorder() {
  if (ampNode && ampNode.context === Tone.getContext()) {
    recorder = new Tone.Recorder();
    ampNode.connect(recorder);
  } else {
    console.error('Não foi possível conectar ampNode ao gravador.');
  }
}

async function startRecording() {
  if (!recording) {
    if (!recorder) {
      initializeRecorder();
    }
    try {
      // Verifica se o contexto do Tone já foi iniciado por uma interação do usuário
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      recorder.start();
      recording = true;
      document.getElementById('recordBtn').textContent = 'Parar Gravação';
    } catch (err) {
      console.error('Erro ao iniciar a gravação:', err);
    }
  } else {
    stopRecording();
  }
}

async function stopRecording() {
  if (recording && recorder) {
    recording = false;
    document.getElementById('recordBtn').textContent = 'Gravar';
    try {
      const recording = await recorder.stop();
      const url = URL.createObjectURL(recording);
      // Atualiza o link de download e o torna visível
      const downloadLink = document.getElementById('downloadLink');
      downloadLink.href = url;
      downloadLink.download = 'recording.mp3';
      downloadLink.style.display = 'block';
    } catch (err) {
      console.error('Erro ao parar a gravação:', err);
    }
  }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Iniciar áudio por interação do usuário
    const initAudioButton = document.getElementById('init-audio');
    if (initAudioButton) {
        initAudioButton.addEventListener('click', async () => {
            await initAudio();
            console.log('Áudio inicializado.');
            initAudioButton.disabled = true; // Desativa o botão após a inicialização
            initAudioButton.style.display = 'none'; // Oculta o botão após a inicialização
        });
    }
    
    // Event listeners para botões e controles
    document.getElementById('recordBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);

    document.getElementById('startMetronome').addEventListener('click', () => {
        if (isMetronomeRunning) {
            stopMetronome();
        } else {
            startMetronome();
        }
    });

    document.getElementById('bpm').addEventListener('input', () => {
        const bpm = document.getElementById('bpm').value;
        Tone.Transport.bpm.value = bpm;
        if (isMetronomeRunning) {
            stopMetronome();
            startMetronome();
        }
    });

    document.getElementById('startTuner').addEventListener('click', () => {
        const startButton = document.getElementById('startTuner');
        if (startButton.textContent === 'Afinar') {
            startTuner();
            startButton.textContent = 'Parar';
        } else {
            stopTuner();
            startButton.textContent = 'Afinar';
        }
    });

    document.getElementById('tuning-select').addEventListener('change', function() {
        selectedTuning = this.value;
        console.log(`Afinação selecionada: ${selectedTuning}`);
    });

    document.getElementById('amp-select').addEventListener('change', async (event) => {
        const selectedAmp = event.target.value;
      
        // Desconecta o ampNode atual, se existir
        if (ampNode) {
          ampNode.disconnect();
        }
      
        // Carrega o novo amplificador
        ampNode = await loadAmplifier(selectedAmp);
      
        // Conecta o novo amplificador à saída de áudio
        ampNode.connect(audioContext.destination);
      
        // Se houver pedais selecionados, o último pedal deve ser conectado ao novo amplificador
        if (selectedPedals.length > 0) {
          const lastPedalId = selectedPedals[selectedPedals.length - 1];
          const lastPedal = availablePedals.find(p => p.id === lastPedalId);
          const lastNodeKey = Object.keys(lastPedal.nodes)[Object.keys(lastPedal.nodes).length - 1];
          lastPedal.nodes[lastNodeKey].disconnect();
          lastPedal.nodes[lastNodeKey].connect(ampNode);
        } else {
          // Se não houver pedais selecionados, a entrada deve ser conectada diretamente ao novo amplificador
          inputNode.disconnect();
          inputNode.connect(ampNode);
        }
      
        // Recria os controles do amplificador
        createAmpControls();
      });
});

// --- Funções Auxiliares ---

function getAudioContext() {
  return audioContext;
}

function getInputNode() {
  return inputNode;
}

function getOutputNode() {
  return outputNode;
}

function getAmpNode() {
  return ampNode;
}

function setAmpNode(newAmpNode) {
  ampNode = newAmpNode;
}

function getSelectedPedals() {
  return selectedPedals;
}

function getAvailablePedals() {
  return availablePedals;
}

function initializePedal(pedalId) {
    const pedal = pedalData.find(p => p.id === pedalId);
    if (!pedal) {
      console.error(`Pedal with ID '${pedalId}' not found.`);
      return;
    }
  
    // Verifica se o Tone.js já foi inicializado
    if (Tone.context.state !== 'running') {
      console.error('Tone.js não foi inicializado. Chame initAudio() primeiro.');
      return;
    }
  
    // Cria uma nova instância para cada pedal
    const pedalInstance = {
      id: pedalId,
      nodes: {}
    };
  
    // Criação dos nós de áudio com base no ID do pedal
    switch (pedalId) {
      case 'super-overdrive':
        pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
        pedalInstance.nodes.filter = new Tone.Filter({
          type: 'lowpass',
          frequency: 1000, // Valor inicial, será ajustado pelo controle 'tone'
          Q: 1
        });
        pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.drive);
  
        // Conectando os nós
        pedalInstance.nodes.gain.connect(pedalInstance.nodes.filter);
        pedalInstance.nodes.filter.connect(pedalInstance.nodes.distortion);
        pedalInstance.nodes.distortion.connect(outputNode);
        break;
  
      case 'distortion':
          pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
          pedalInstance.nodes.filter = new Tone.Filter({
              type: 'lowpass',
              frequency: 1000, // Valor inicial, será ajustado pelo controle 'tone'
              Q: 1
          });
          pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.distortion);
          
          // Conectando os nós
          pedalInstance.nodes.gain.connect(pedalInstance.nodes.filter);
          pedalInstance.nodes.filter.connect(pedalInstance.nodes.distortion);
          pedalInstance.nodes.distortion.connect(outputNode);
          break;
  
      case 'metal-zone':
          pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
          pedalInstance.nodes.low = new Tone.BiquadFilter({
            type: 'lowshelf',
            frequency: 100, // Frequência de corte para os graves
            gain: 0 // Ganho inicial, será ajustado pelo controle 'low'
          });
          pedalInstance.nodes.high = new Tone.BiquadFilter({
            type: 'highshelf',
            frequency: 2000, // Frequência de corte para os agudos
            gain: 0 // Ganho inicial, será ajustado pelo controle 'high'
          });
          pedalInstance.nodes.middle = new Tone.BiquadFilter({
            type: 'peaking',
            frequency: 500, // Frequência central para os médios
            Q: 1,
            gain: 0 // Ganho inicial, será ajustado pelo controle 'middle'
          });
          pedalInstance.nodes.midFreq = new Tone.BiquadFilter({
            type: 'peaking',
            frequency: 700,
            Q: 1,
            gain: 0 // Ganho inicial, será ajustado pelo controle 'middle'
          });
          pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.dist);
  
          // Conectando os nós
          pedalInstance.nodes.gain.connect(pedalInstance.nodes.low);
          pedalInstance.nodes.low.connect(pedalInstance.nodes.high);
          pedalInstance.nodes.high.connect(pedalInstance.nodes.middle);
          pedalInstance.nodes.middle.connect(pedalInstance.nodes.midFreq);
          pedalInstance.nodes.midFreq.connect(pedalInstance.nodes.distortion);
          pedalInstance.nodes.distortion.connect(outputNode);
          break;
  
          case 'metalcore':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
            pedalInstance.nodes.low = new Tone.BiquadFilter({
              type: 'lowshelf',
              frequency: 100, // Frequência de corte para os graves
              gain: 0 // Ganho inicial, será ajustado pelo controle 'low'
            });
            pedalInstance.nodes.high = new Tone.BiquadFilter({
              type: 'highshelf',
              frequency: 4000, // Frequência de corte para os agudos
              gain: 0 // Ganho inicial, será ajustado pelo controle 'high'
            });
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.distortion);
        
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.low);
            pedalInstance.nodes.low.connect(pedalInstance.nodes.high);
            pedalInstance.nodes.high.connect(pedalInstance.nodes.distortion);
            pedalInstance.nodes.distortion.connect(outputNode);
            break;
  
        case 'compression-sustainer':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
            pedalInstance.nodes.filter = new Tone.Filter({
              type: 'lowpass',
              frequency: 5000, // Frequência de corte, será ajustada pelo controle 'tone'
              Q: 1
            });
            pedalInstance.nodes.compressor = new Tone.Compressor({
              threshold: -24, // dB
              ratio: 12,
              attack: 0.01, // Segundos, será ajustado pelo controle 'attack'
              release: 0.25, // Segundos, será ajustado pelo controle 'sustain'
              knee: 30
            });
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.filter);
            pedalInstance.nodes.filter.connect(pedalInstance.nodes.compressor);
            pedalInstance.nodes.compressor.connect(outputNode);
            break;
  
        case 'acoustic-simulator':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
            pedalInstance.nodes.reverb = new Tone.Reverb({
              decay: 1.5,
              preDelay: 0.01,
              wet: pedal.initialSettings.reverb // Controla a quantidade de efeito
            });
            pedalInstance.nodes.bodyFilter = new Tone.BiquadFilter({
              type: 'bandpass',
              frequency: 850, // Frequência central para o corpo do violão
              Q: 1,
              gain: 0
            });
            // 'top' pode ser mapeado para um filtro highshelf para simular a clareza do som acústico
            pedalInstance.nodes.highShelf = new Tone.BiquadFilter({
              type: 'highshelf',
              frequency: 5000, // Frequência de corte para os agudos
              gain: 0 // Ganho inicial, será ajustado pelo controle 'top'
            });
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.reverb);
            pedalInstance.nodes.reverb.connect(pedalInstance.nodes.bodyFilter);
            pedalInstance.nodes.bodyFilter.connect(pedalInstance.nodes.highShelf);
            pedalInstance.nodes.highShelf.connect(outputNode);
            break;
  
        case 'chorus-ce2w':
            pedalInstance.nodes.chorus = new Tone.Chorus({
              frequency: pedal.initialSettings.rate, // Taxa de modulação
              delayTime: 3.5, // Tempo de atraso em milissegundos
              depth: pedal.initialSettings.depth, // Profundidade do efeito
              type: 'sine', // Tipo de forma de onda
              spread: 180 // Espalhamento estéreo
            });
  
            // Conectando os nós
            pedalInstance.nodes.chorus.connect(outputNode);
            break;
  
        case 'super-chorus':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.eLevel);
            pedalInstance.nodes.eq = new Tone.EQ3({
              low: 0, // Ganho inicial para baixas frequências, será ajustado pelo controle 'eqLoHi'
              mid: 0,
              high: 0 // Ganho inicial para altas frequências, será ajustado pelo controle 'eqLoHi'
            });
            pedalInstance.nodes.chorus = new Tone.Chorus({
              frequency: pedal.initialSettings.rate, // Taxa de modulação
              delayTime: 4, // Tempo de atraso em milissegundos
              depth: pedal.initialSettings.depth // Profundidade do efeito
            });
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.eq);
            pedalInstance.nodes.eq.connect(pedalInstance.nodes.chorus);
            pedalInstance.nodes.chorus.connect(outputNode);
            break;
  
        case 'digital-delay':
            pedalInstance.nodes.feedbackDelay = new Tone.FeedbackDelay({
              delayTime: pedal.initialSettings.dTime, // Tempo de atraso, será ajustado pelo controle 'dTime'
              feedback: pedal.initialSettings.fBack // Quantidade de feedback, será ajustado pelo controle 'fBack'
            });
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.eLevel);
  
            // Conectando os nós
            pedalInstance.nodes.feedbackDelay.connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.gain.connect(outputNode);
            break;
  
        case 'phase-shifter':
            pedalInstance.nodes.phaser = new Tone.Phaser({
              frequency: pedal.initialSettings.rate, // Taxa de modulação
              octaves: 5, // Número de oitavas para o efeito
              baseFrequency: pedal.initialSettings.res, // Frequência base, será ajustado pelo controle 'res'
              depth: pedal.initialSettings.depth // Profundidade do efeito
            });
  
            // Conectando os nós
            pedalInstance.nodes.phaser.connect(outputNode);
            break;
  
        case 'synthesizer-sy1':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.direct);
            // Implementação do efeito synth (complexo, requer osciladores, filtros, envelopes, etc.)
            // Exemplo simplificado com um oscilador e um filtro
            pedalInstance.nodes.oscillator = new Tone.Oscillator().start();
            pedalInstance.nodes.filter = new Tone.Filter({
              type: 'lowpass',
              frequency: 1000,
              Q: 1
            });
  
            // Conectando os nós
            pedalInstance.nodes.oscillator.connect(pedalInstance.nodes.filter);
            pedalInstance.nodes.filter.connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.gain.connect(outputNode);
            break;
  
        case 'blues-driver':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
            pedalInstance.nodes.filter = new Tone.Filter({
              type: 'lowpass',
              frequency: 1000, // Valor inicial, será ajustado pelo controle 'tone'
              Q: 1
            });
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.gain);
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.filter);
            pedalInstance.nodes.filter.connect(pedalInstance.nodes.distortion);
            pedalInstance.nodes.distortion.connect(outputNode);
            break;
  
        case 'equalizer-ge7':
            // Equalizer requer uma cadeia de filtros biquad, um para cada banda de frequência
            const freqValues = [100, 200, 400, 800, 1600, 3200, 6400]; // Frequências em Hz para cada banda
            pedalInstance.nodes.filters = freqValues.map((freq, index) => {
              const filter = new Tone.BiquadFilter(freq, 'peaking');
              filter.gain.value = pedal.initialSettings[`freq${freq.toString().replace('.', '_')}`]; // Obtém o ganho inicial
              return filter;
            });
  
            // Conectar os filtros em série
            for (let i = 0; i < pedalInstance.nodes.filters.length - 1; i++) {
              pedalInstance.nodes.filters[i].connect(pedalInstance.nodes.filters[i + 1]);
            }
  
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.filters[0]);
            pedalInstance.nodes.filters[pedalInstance.nodes.filters.length - 1].connect(outputNode);
            break;
  
        case 'tremolo-tr2':
            pedalInstance.nodes.tremolo = new Tone.Tremolo({
              frequency: pedal.initialSettings.rate * 10, // Multiplicando por 10 para um efeito mais perceptível
              depth: pedal.initialSettings.depth,
              type: pedal.initialSettings.wave
            }).start();
  
            // Conectando os nós
            pedalInstance.nodes.tremolo.connect(outputNode);
            break;
  
        case 'fuzz-fz1w':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
            pedalInstance.nodes.filter = new Tone.Filter({
              type: 'lowpass',
              frequency: 1000, // Valor inicial, será ajustado pelo controle 'tone'
              Q: 1
            });
            pedalInstance.nodes.fuzz = new Tone.Distortion(pedal.initialSettings.fuzz);
  
            // Mapeamento do parâmetro 'mode' para diferentes configurações de fuzz
            switch (pedal.initialSettings.mode) {
              case 'v':
                pedalInstance.nodes.fuzz.distortion = 0.6;
                break;
              case 'm':
                pedalInstance.nodes.fuzz.distortion = 0.9;
                break;
            }
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.filter);
            pedalInstance.nodes.filter.connect(pedalInstance.nodes.fuzz);
            pedalInstance.nodes.fuzz.connect(outputNode);
            break;
  
        case 'acoustic-preamp-ad2':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level);
            pedalInstance.nodes.reverb = new Tone.Reverb(pedal.initialSettings.ambience);
            pedalInstance.nodes.notchFilter = new Tone.BiquadFilter(500, 'notch'); // Frequência central, será ajustada pelo controle 'notch'
            pedalInstance.nodes.resonance = new Tone.BiquadFilter(800, 'peaking'); // Frequência central, será ajustada pelo controle 'resonance'
  
            // Conectando os nós
            pedalInstance.nodes.gain.connect(pedalInstance.nodes.reverb);
            pedalInstance.nodes.reverb.connect(pedalInstance.nodes.notchFilter);
            pedalInstance.nodes.notchFilter.connect(pedalInstance.nodes.resonance);
            pedalInstance.nodes.resonance.connect(outputNode);
            break;
            default:
                console.warn(`Pedal ${pedalId} não possui configuração de áudio definida.`);
                break;
        }
    
        availablePedals.push(pedalInstance);
    }
    
    function activatePedal(pedalId) {
        const pedal = availablePedals.find(p => p.id === pedalId);
        if (!pedal) {
            console.warn(`Pedal ${pedalId} não encontrado em availablePedals.`);
            return;
        }
        // Verifica se o inputNode está definido e se ele tem conexões ativas antes de tentar desconectar
        if (inputNode && inputNode.numberOfOutputs > 0) {
            inputNode.disconnect(); // Desconecta o inputNode de qualquer nó anterior
        }
    
        // Conecta a entrada ao primeiro nó do pedal
        if (pedal.nodes && Object.keys(pedal.nodes).length > 0) {
            const firstNodeKey = Object.keys(pedal.nodes)[0];
            inputNode.connect(pedal.nodes[firstNodeKey]);
            console.log(`Pedal ${pedalId} ativado: inputNode conectado a ${firstNodeKey}.`);
        } else {
            console.warn(`Pedal ${pedalId} não possui nós de áudio definidos.`);
        }
    
        // Encontra o último nó na cadeia de nós do pedal
        const lastNodeKey = Object.keys(pedal.nodes)[Object.keys(pedal.nodes).length - 1];
    
        // Verifica se o último nó do pedal já está conectado a algum nó antes de tentar desconectar
        if (pedal.nodes[lastNodeKey] && pedal.nodes[lastNodeKey].numberOfOutputs > 0) {
            pedal.nodes[lastNodeKey].disconnect();
        }
    
        // Conecta o último nó do pedal à saída
        pedal.nodes[lastNodeKey].connect(outputNode);
        console.log(`Pedal ${pedalId} ativado: ${lastNodeKey} conectado a outputNode.`);
    }
    
    
    function deactivatePedal(pedalId) {
        const pedal = availablePedals.find(p => p.id === pedalId);
        if (!pedal) {
            console.warn(`Pedal ${pedalId} não encontrado em availablePedals.`);
            return;
        }
    
        // Desconectar o pedal da cadeia de áudio
        if (inputNode) {
            inputNode.disconnect(); // Desconecta de qualquer nó anterior
        }
    
        const lastNodeKey = Object.keys(pedal.nodes)[Object.keys(pedal.nodes).length - 1];
        if (pedal.nodes[lastNodeKey]) {
            pedal.nodes[lastNodeKey].disconnect();
            console.log(`Pedal ${pedalId} desativado: ${lastNodeKey} desconectado.`);
        }
    
        // Reconectar a entrada ao amplificador se não houver pedais ativos
        if (selectedPedals.length === 0) {
            inputNode.connect(ampNode);
            console.log('Nenhum pedal ativo, inputNode conectado ao ampNode.');
        } else {
            // Reconectar os pedais ativos
            connectPedalsToInputOutput();
            console.log('Pedais ativos reconectados.');
        }
    }
    
    // Função para atualizar os controles do pedal
    function updatePedalControl(pedalId, controlId, value) {
      const pedal = availablePedals.find(p => p.id === pedalId);
      if (!pedal) {
          console.warn(`Pedal ${pedalId} não encontrado.`);
          return;
      }
    
      // Atualiza o valor do controle no objeto de configurações do pedal
      const control = pedalData.find(p => p.id === pedalId).controls.find(c => c.id === controlId);
      if (control) {
          pedalData.find(p => p.id === pedalId).initialSettings[control.param] = value;
      }
    
      // Mapeamento dos parâmetros dos controles para os nós de áudio correspondentes
      switch (controlId) {
        case 'level-overdrive':
          if (pedal.nodes.gain) {
            pedal.nodes.gain.gain.value = value;
          }
          break;
        case 'tone-overdrive':
          if (pedal.nodes.filter) {
            pedal.nodes.filter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário
          }
          break;
        case 'drive-overdrive':
          if (pedal.nodes.distortion) {
            pedal.nodes.distortion.distortion = value; // A distorção geralmente varia de 0 a 1
          }
          break;
        // Repita o processo para os outros controles de cada pedal
        case 'level-distortion':
          if (pedal.nodes.gain) {
            pedal.nodes.gain.gain.value = value;
          }
          break;
        case 'tone-distortion':
          if (pedal.nodes.filter) {
            pedal.nodes.filter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário
          }
          break;
        case 'distortion-distortion':
          if (pedal.nodes.distortion) {
            pedal.nodes.distortion.distortion = value;
          }
          break;
        case 'level-metalzone':
            if (pedal.nodes.gain) {
              pedal.nodes.gain.gain.value = value;
            }
            break;
          case 'low-metalzone':
            if (pedal.nodes.low) {
              pedal.nodes.low.frequency.value = value * 800;
              pedal.nodes.low.gain.value = value * 50;// Ajuste conforme necessário para o efeito desejado
            }
            break;
          case 'high-metalzone':
            if (pedal.nodes.high) {
              pedal.nodes.high.frequency.value = value * 5000;
              pedal.nodes.high.gain.value = value * 50;  // Ajuste conforme necessário para o efeito desejado
            }
            break;
          case 'middle-metalzone':
            if (pedal.nodes.middle) {
              pedal.nodes.middle.frequency.value = value * 2000;
              pedal.nodes.middle.gain.value = value * 50; // Ajuste conforme necessário para o efeito desejado
            }
            break;
          case 'mid-freq-metalzone':
            if (pedal.nodes.midFreq) {
              pedal.nodes.midFreq.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário
            }
            break;
          case 'dist-metalzone':
            if (pedal.nodes.distortion) {
              pedal.nodes.distortion.distortion = value;
            }
            break;
        case 'level-metalcore':
            if (pedal.nodes.gain) {
              pedal.nodes.gain.gain.value = value;
            }
            break;
          case 'low-metalcore':
            if (pedal.nodes.low) {
              pedal.nodes.low.gain.value = value * 50;
            }
            break;
          case 'high-metalcore':
            if (pedal.nodes.high) {
              pedal.nodes.high.gain.value = value * 50; 
            }
            break;
          case 'distortion-metalcore':
            if (pedal.nodes.distortion) {
              pedal.nodes.distortion.distortion = value;
            }
            break;
        case 'level-compression':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'tone-compression':
            if (pedal.nodes.filter) {
                pedal.nodes.filter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'attack-compression':
            if (pedal.nodes.compressor) {
                pedal.nodes.compressor.attack.value = value; // 'attack' geralmente varia de 0 a 1
            }
            break;
        case 'sustain-compression':
            if (pedal.nodes.compressor) {
                pedal.nodes.compressor.release.value = value; // 'sustain' pode ser mapeado para 'release' que também varia de 0 a 1
            }
            break;
        case 'reverb-acoustic':
            if (pedal.nodes.reverb) {
                pedal.nodes.reverb.wet.value = value; // 'reverb' pode ser mapeado para o parâmetro 'wet' de Tone.Reverb
            }
            break;
        case 'level-acoustic':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'body-acoustic':
            if (pedal.nodes.filter) {
                pedal.nodes.filter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário para 'body'
            }
            break;
        case 'top-acoustic':
            if (pedal.nodes.highShelf) {
                pedal.nodes.highShelf.frequency.value = value * 5000; // Ajuste o fator multiplicador conforme necessário para 'top'
            }
            break;
        case 'simulation-type':
            console.log(value)
            break;
        case 'rate-chorus':
            if (pedal.nodes.chorus) {
                pedal.nodes.chorus.frequency.value = value * 10; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'depth-chorus':
            if (pedal.nodes.chorus) {
                pedal.nodes.chorus.depth.value = value;
            }
            break;
        case 'mode-chorus':
            if (pedal.nodes.chorus) {
                // Lógica para mudar o modo do chorus, se aplicável
            }
            break;
        case 'e-level-superchorus':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'eq-lo-hi-superchorus':
            if (pedal.nodes.eq) {
                // 'eq-lo-hi' pode ser mapeado para ajustar os ganhos de 'low' e 'high' do Tone.EQ3
                pedal.nodes.eq.low.value = value * 40 - 20; // Exemplo de mapeamento, ajuste conforme necessário
                pedal.nodes.eq.high.value = value * 40 - 20; // Exemplo de mapeamento, ajuste conforme necessário
            }
            break;
        case 'rate-superchorus':
            if (pedal.nodes.chorus) {
                pedal.nodes.chorus.frequency.value = value * 10; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'depth-superchorus':
            if (pedal.nodes.chorus) {
                pedal.nodes.chorus.depth.value = value;
            }
            break;
        case 'e-level-digitaldelay':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'f-back-digitaldelay':
            if (pedal.nodes.feedbackDelay) {
                pedal.nodes.feedbackDelay.feedback.value = value; // 'f-back' mapeado para 'feedback'
            }
            break;
        case 'd-time-digitaldelay':
            if (pedal.nodes.feedbackDelay) {
                pedal.nodes.feedbackDelay.delayTime.value = value; // 'd-time' mapeado para 'delayTime'
            }
            break;
        case 'mode-digitaldelay':
            // Aqui você pode adicionar a lógica para alterar os modos do delay, se necessário
            console.log(`Modo de delay alterado para: ${value}`);
            break;
        case 'rate-phaseshifter':
            if (pedal.nodes.phaser) {
                pedal.nodes.phaser.frequency.value = value; // 'rate' mapeado para 'frequency'
            }
            break;
        case 'depth-phaseshifter':
            if (pedal.nodes.phaser) {
                pedal.nodes.phaser.depth.value = value;
            }
            break;
        case 'res-phaseshifter':
            if (pedal.nodes.phaser) {
                pedal.nodes.phaser.baseFrequency = value * 1000; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'stage-phaseshifter':
            // 'stage' pode ser mapeado para diferentes configurações do Phaser, se aplicável
            console.log(`Stage do phaser alterado para: ${value}`);
            break;
        case 'direct-synthesizer':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value; // 'direct' pode ser mapeado para o ganho de entrada
            }
            break;
        case 'effect-synthesizer':
            // 'effect' pode ser mapeado para o ganho de saída ou um parâmetro de mistura, dependendo do efeito synth
            console.log(`Nível do efeito synthesizer alterado para: ${value}`);
            break;
        case 'depth-synthesizer':
            // 'depth' para um synth pode ser mapeado para a profundidade de modulação ou um parâmetro similar
            console.log(`Profundidade do synthesizer alterada para: ${value}`);
            break;
        case 'tone-rate-synthesizer':
            // 'tone-rate' pode ser mapeado para a frequência de um filtro ou oscilador
            console.log(`Tone/Rate do synthesizer alterado para: ${value}`);
            break;
        case 'variation-synthesizer':
            // 'variation' pode ser usado para alternar entre diferentes presets ou configurações do synth
            console.log(`Variação do synthesizer alterada para: ${value}`);
            break;
        case 'type-synthesizer':
            // 'type' para um synth seleciona o tipo de forma de onda, timbre, etc.
            console.log(`Tipo do synthesizer alterado para: ${value}`);
            break;
        case 'level-bluesdriver':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'tone-bluesdriver':
            if (pedal.nodes.filter) {
                pedal.nodes.filter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'gain-bluesdriver':
            if (pedal.nodes.distortion) {
                pedal.nodes.distortion.distortion = value; // A distorção geralmente varia de 0 a 1
            }
            break;
        case 'level-equalizer':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'freq-100':
        case 'freq-200':
        case 'freq-400':
        case 'freq-800':
        case 'freq-1.6k':
        case 'freq-3.2k':
        case 'freq-6.4k':
            // Para cada banda de frequência, encontre o filtro correspondente e ajuste seu ganho
            const freqBand = controlId.replace('freq-', '').replace('k', '000'); // Converte 'freq-1.6k' para '1600'
            const filterNode = pedal.nodes.filters.find(filter => filter.frequency.value === parseFloat(freqBand));
            if (filterNode) {
                filterNode.gain.value = value; // Ajusta o ganho do filtro correspondente
            }
            break;
        case 'rate-tremolo':
            if (pedal.nodes.tremolo) {
                pedal.nodes.tremolo.frequency.value = value * 10; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'wave-tremolo':
            if (pedal.nodes.tremolo) {
                pedal.nodes.tremolo.type = value;
            }
            break;
        case 'depth-tremolo':
            if (pedal.nodes.tremolo) {
                pedal.nodes.tremolo.depth.value = value;
            }
            break;
        case 'level-fuzz':
            if (pedal.nodes.gain) {
                pedal.nodes.gain.gain.value = value;
            }
            break;
        case 'tone-fuzz':
            if (pedal.nodes.filter) {
                pedal.nodes.filter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário
            }
            break;
        case 'fuzz-fuzz':
            if (pedal.nodes.fuzz) {
                pedal.nodes.fuzz.distortion = value; // A distorção geralmente varia de 0 a 1
            }
            break;
        case 'mode-fuzz':
            if (pedal.nodes.fuzz) {
                // Aqui você pode adicionar a lógica para alterar os modos do fuzz
            }
            break;
        case 'ambience-ad2':
            if (pedal.nodes.reverb) {
                pedal.nodes.reverb.wet.value = value; // 'ambience' mapeado para o parâmetro 'wet' do reverb
            }
            break;
        case 'notch-ad2':
            if (pedal.nodes.notchFilter) {
                pedal.nodes.notchFilter.frequency.value = value * 1000; // Ajuste o fator multiplicador conforme necessário para 'notch'
            }
            break;
        case 'resonance-ad2':
            if (pedal.nodes.resonance) {
                pedal.nodes.resonance.gain.value = value; // Ajuste conforme necessário para o efeito de ressonância
            }
            break;
        default:
          console.warn(`Controle ${controlId} não mapeado para o pedal ${pedalId}`);
      }
    }
    
    // --- Configuração do Amplificador ---
    
    async function initializeAmplifier() {
      const ampSelect = document.getElementById('amp-select');
      const selectedAmp = ampSelect.value;
      ampNode = await loadAmplifier(selectedAmp);
    
      // Cria os controles do amplificador
      createAmpControls();
    
      // Conecta o amplificador ao destino (saída de áudio)
      ampNode.connect(audioContext.destination);
    }
    
    function createAmpControls() {
      const ampControlsContainer = document.querySelector('.amp-controls');
      ampControlsContainer.innerHTML = ''; // Limpa os controles existentes
    
      const controls = [
        { id: 'amp-volume', label: 'Volume', param: 'volume', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
        { id: 'amp-bass', label: 'Bass', param: 'bass', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
        { id: 'amp-middle', label: 'Middle', param: 'middle', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
        { id: 'amp-treble', label: 'Treble', param: 'treble', min: 0, max: 1, step: 0.01, defaultValue: 0.5 },
        { id: 'amp-reverb', label: 'Reverb', param: 'reverb', min: 0, max: 1, step: 0.01, defaultValue: 0 },
      ];
    
      controls.forEach(control => {
        const label = document.createElement('label');
        label.textContent = control.label;
        label.htmlFor = control.id;
    
        const input = document.createElement('input');
        input.type = 'range';
        input.id = control.id;
        input.min = control.min;
        input.max = control.max;
        input.step = control.step;
        input.value = control.defaultValue;
        input.addEventListener('input', (event) => {
          const value = parseFloat(event.target.value);
          updateAmpControl(control.param, value);
        });
    
        const controlGroup = document.createElement('div');
        controlGroup.classList.add('amp-control-group');
        controlGroup.appendChild(label);
        controlGroup.appendChild(input);
        ampControlsContainer.appendChild(controlGroup);
      });
    }
    
    // Função fictícia para carregar o amplificador (substitua pela sua lógica real)
    async function loadAmplifier(ampName) {
      console.log(`Carregando amplificador: ${ampName}`);
    
      // Carrega a imagem do amplificador selecionado
      const ampImage = document.createElement('img');
      ampImage.src = `img/${ampName}.png`;
      ampImage.alt = ampName;
      ampImage.classList.add('amp-img');
    
      // Substitui a imagem existente, se houver
      const existingImage = document.querySelector('.amp-img');
      if (existingImage) {
        existingImage.remove();
      }
    
      // Adiciona a imagem ao container do amplificador
      const ampContainer = document.getElementById('amp-container');
      ampContainer.prepend(ampImage); // Adiciona a imagem no início do container
    
      // Aqui você carrega o som do amplificador usando Tone.Convolver ou Tone.Sampler
      // Exemplo usando Tone.Convolver (você precisa dos arquivos .wav de Impulse Response)
      const convolver = new Tone.Convolver();
      let irPath;
    
      switch (ampName) {
        case 'jcm900':
          irPath = 'audio/jcm900_ir.wav'; // Substitua pelo caminho correto do arquivo IR
          break;
        case 'jcm800':
          irPath = 'audio/jcm800_ir.wav';
          break;
        case 'fender':
          irPath = 'audio/fender_ir.wav';
          break;
        case 'mesa':
          irPath = 'audio/mesa_ir.wav';
          break;
        case 'randall':
          irPath = 'audio/randall_ir.wav';
          break;
        case 'engl':
          irPath = 'audio/engl_ir.wav';
          break;
        default:
          irPath = 'audio/default_ir.wav'; // Um IR padrão, se o amplificador não for encontrado
      }
    
      try {
        await convolver.load(irPath);
        console.log(`Amplificador ${ampName} carregado.`);
        return convolver;
      } catch (error) {
        console.error(`Erro ao carregar o amplificador ${ampName}:`, error);
        return new Tone.Gain(); // Retorna um nó de ganho vazio em caso de erro
      }
    }
    
    function updateAmpControl(param, value) {
      if (ampNode) {
        switch (param) {
          case 'volume':
            ampNode.volume.value = value; // Ajuste conforme a escala do seu amplificador
            break;
          case 'bass':
            ampNode.set({ bass: value }); // Exemplo, ajuste conforme os parâmetros do seu amplificador
            break;
          case 'middle':
            ampNode.set({ middle: value }); // Exemplo, ajuste conforme os parâmetros do seu amplificador
            break;
          case 'treble':
            ampNode.set({ treble: value }); // Exemplo, ajuste conforme os parâmetros do seu amplificador
            break;
          case 'reverb':
            ampNode.set({ reverb: value }); // Exemplo, ajuste conforme os parâmetros do seu amplificador
            break;
          default:
            console.warn(`Parâmetro de amplificador desconhecido: ${param}`);
        }
      }
    }
    
    // --- Configuração de Áudio ---
    
    async function initAudio() {
        // Cria o contexto de áudio se ele ainda não existir
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // Cria um nó de saída, se necessário
          if (!outputNode) {
            outputNode = audioContext.createGain();
            outputNode.connect(audioContext.destination);
          }
        }
      
        // Verifica se o Tone.js já foi inicializado
        if (Tone.context.state !== 'running') {
          // Inicia o Tone.js somente se ainda não foi inicializado
          await Tone.start();
          Tone.setContext(audioContext);
          console.log('Tone.js foi inicializado e o contexto foi definido.');
        }
      
        // Configura os dispositivos de entrada e saída
        await setupAudioDevices();
      
        // Carrega os pedais disponíveis
        loadAvailablePedals();
      
        // Inicializa o amplificador
        await initializeAmplifier();
      
        // Conecta a entrada à saída, se não houver pedais
        if (selectedPedals.length === 0) {
          inputNode.connect(ampNode);
        }
      
        // O outputNode já está conectado ao destino do contexto de áudio
      }
      
    
    async function setupAudioDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
    
        const inputSelect = document.getElementById('audio-input-select');
        inputSelect.innerHTML = '';
        const outputSelect = document.getElementById('audio-output-select');
        outputSelect.innerHTML = '';
    
        devices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.text = device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${device.kind === 'audioinput' ? inputSelect.length + 1 : outputSelect.length + 1}`;
    
          if (device.kind === 'audioinput') {
            inputSelect.appendChild(option);
            if (!selectedInputDeviceId) selectedInputDeviceId = device.deviceId; // Define o primeiro dispositivo como padrão
          } else if (device.kind === 'audiooutput') {
            outputSelect.appendChild(option);
            if (!selectedOutputDeviceId) selectedOutputDeviceId = device.deviceId; // Define o primeiro dispositivo como padrão
          }
        });
    
        inputSelect.addEventListener('change', handleInputChange);
        outputSelect.addEventListener('change', handleOutputChange);
    
      } catch (error) {
        console.error('Erro ao configurar dispositivos de áudio:', error);
      }
    }
    
    async function handleInputChange() {
        const inputSelect = document.getElementById('audio-input-select');
        selectedInputDeviceId = inputSelect.value
        // Desconecta o inputNode anterior, se existir
        if (inputNode) {
            inputNode.disconnect();
        }
        
        // Interrompe as faixas de mídia do stream anterior, se existir
        if (window.currentStream && window.currentStream.getTracks) {
            window.currentStream.getTracks().forEach(track => track.stop());
        }
    
        try {
            // Obtém o novo stream de áudio com base no ID do dispositivo selecionado
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: selectedInputDeviceId } }
            });
    
            // Atualiza o stream atual
            window.currentStream = stream;
    
            // Cria um novo MediaStreamSourceNode com o novo stream
            inputNode = audioContext.createMediaStreamSource(stream);
    
            // Conecta o inputNode à cadeia de áudio, se necessário
            reconnectInputToPedals();
    
        } catch (error) {
            console.error('Erro ao trocar o dispositivo de entrada de áudio:', error);
        }
    }
    
    function reconnectInputToPedals() {
        if (selectedPedals.length > 0) {
            // Desconecta a entrada atual de qualquer pedal conectado
            inputNode.disconnect();
    
            // Reconecta a entrada ao primeiro pedal da cadeia
            const firstPedalId = selectedPedals[0];
            const firstPedal = availablePedals.find(p => p.id === firstPedalId);
            if (firstPedal) {
                inputNode.connect(firstPedal.nodes[Object.keys(firstPedal.nodes)[0]]);
            }
        } else {
            // Se não houver pedais selecionados, conecta a entrada diretamente ao amplificador
            inputNode.connect(ampNode);
        }
    }
    
    async function handleOutputChange() {
        selectedOutputDeviceId = document.getElementById('audio-output-select').value;
        await audioContext.setSinkId(selectedOutputDeviceId);
        console.log(`Saída de áudio alterada para: ${selectedOutputDeviceId}`);
    }
    
    // --- Carregamento dos Pedais ---
    
    function loadAvailablePedals() {
      const availablePedalsContainer = document.getElementById('available-pedals');
      pedalData.forEach(pedal => {
        const pedalElement = createPedalElement(pedal);
        availablePedals.push({
            id: pedal.id,
            name: pedal.name,
            imageUrl: pedal.imageUrl,
            controls: pedal.controls,
            initialSettings: pedal.initialSettings,
            nodes: {} // Adiciona a propriedade 'nodes' para armazenar os nós de áudio do Tone.js
          });
        availablePedalsContainer.appendChild(pedalElement);
      });
    }
    
    
    
    function startMetronome() {
      if (isMetronomeRunning) return; // Evita iniciar múltiplos metrônomos
      const bpm = parseInt(document.getElementById('bpm').value);
      const interval = 60 / bpm;
    
      // Inicia o Tone.Transport para controlar o tempo
      Tone.Transport.start();
    
      // Agenda o som do metrônomo para tocar em loop
      metronomeIntervalId = Tone.Transport.scheduleRepeat((time) => {
          metronome.triggerAttackRelease("C1", "8n", time);
      }, interval);
    
      isMetronomeRunning = true;
      document.getElementById('startMetronome').textContent = '⏸️';
    }
    
    function stopMetronome() {
      // Para o agendamento do metrônomo
      Tone.Transport.clear(metronomeIntervalId);
      metronomeIntervalId = null; // Limpa o ID do intervalo
    
      // Para o Tone.Transport
      Tone.Transport.stop();
    
      isMetronomeRunning = false;
      document.getElementById('startMetronome').textContent = '▶️';
    }
    
    document.getElementById('startMetronome').addEventListener('click', () => {
      if (isMetronomeRunning) {
        stopMetronome();
      } else {
        startMetronome();
      }
    });
    
    document.getElementById('bpm').addEventListener('input', () => {
        const bpm = document.getElementById('bpm').value;
        Tone.Transport.bpm.value = bpm; // Atualiza o BPM do Tone.Transport
        // Atualiza o BPM do Tone.Transport se o metrônomo estiver rodando
        if (isMetronomeRunning) {
            stopMetronome();
            startMetronome();
        }
    });
    
   
// --- Inicialização ---

connectPedalsToInputOutput();
initializeAmplifier();
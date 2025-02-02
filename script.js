import * as Tone from './libs/tone.js'; // Ou o caminho correto para o Tone.js

// --- Configurações Iniciais ---
let audioContext;
let inputNode;
let outputNode;
let selectedInputDeviceId = null;
let selectedOutputDeviceId = null;
const availablePedals = []; // Array para armazenar os pedais disponíveis
const selectedPedals = []; // Array para armazenar os pedais selecionados pelo usuário
const maxPedals = 8; // Número máximo de pedais que o usuário pode selecionar
let ampNode;

const pedalData = [
    // ... (Objetos com os dados dos pedais, como no exemplo anterior)
    {
        id: 'super-overdrive',
        name: 'Super Overdrive SD-1',
        imageUrl: 'img/super-overdrive-sd1.png',
        controls: [
            { id: 'level-overdrive', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'tone-overdrive', label: 'Tone', type: 'range', min: 0, max: 1, step: 0.01, param: 'tone' },
            { id: 'drive-overdrive', label: 'Drive', type: 'range', min: 0, max: 1, step: 0.01, param: 'drive' }
        ],
        initialSettings: { level: 0.5, tone: 0.5, drive: 0.5 }
    },
    {
        id: 'distortion',
        name: 'Distortion DS-1',
        imageUrl: 'img/distortion-ds1.png',
        controls: [
            { id: 'level-distortion', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'tone-distortion', label: 'Tone', type: 'range', min: 0, max: 1, step: 0.01, param: 'tone' },
            { id: 'distortion-distortion', label: 'Distortion', type: 'range', min: 0, max: 1, step: 0.01, param: 'distortion' }
        ],
        initialSettings: { level: 0.5, tone: 0.5, distortion: 0.5 }
    },
    {
        id: 'metal-zone',
        name: 'Metal Zone MT-2',
        imageUrl: 'img/metalzone-mt2.png',
        controls: [
            { id: 'level-metalzone', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'low-metalzone', label: 'Low', type: 'range', min: 0, max: 1, step: 0.01, param: 'low' },
            { id: 'high-metalzone', label: 'High', type: 'range', min: 0, max: 1, step: 0.01, param: 'high' },
            { id: 'middle-metalzone', label: 'Middle', type: 'range', min: 0, max: 1, step: 0.01, param: 'middle' },
            { id: 'mid-freq-metalzone', label: 'Mid Freq', type: 'range', min: 0, max: 1, step: 0.01, param: 'midFreq' },
            { id: 'dist-metalzone', label: 'Dist', type: 'range', min: 0, max: 1, step: 0.01, param: 'dist' }
        ],
        initialSettings: { level: 0.5, low: 0.5, high: 0.5, middle: 0.5, midFreq: 0.5, dist: 0.5 }
    },
    {
        id: 'metalcore',
        name: 'Metal Core ML-2',
        imageUrl: 'img/metalcore-ml2.png',
        controls: [
            { id: 'level-metalcore', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'low-metalcore', label: 'Low', type: 'range', min: 0, max: 1, step: 0.01, param: 'low' },
            { id: 'high-metalcore', label: 'High', type: 'range', min: 0, max: 1, step: 0.01, param: 'high' },
            { id: 'distortion-metalcore', label: 'Distortion', type: 'range', min: 0, max: 1, step: 0.01, param: 'distortion' }
        ],
        initialSettings: { level: 0.5, low: 0.5, high: 0.5, distortion: 0.5 }
    },
    {
        id: 'compression-sustainer',
        name: 'Compression Sustainer CS-3',
        imageUrl: 'img/compressionsustainer-cs3.png',
        controls: [
            { id: 'level-compression', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'tone-compression', label: 'Tone', type: 'range', min: 0, max: 1, step: 0.01, param: 'tone' },
            { id: 'attack-compression', label: 'Attack', type: 'range', min: 0, max: 1, step: 0.01, param: 'attack' },
            { id: 'sustain-compression', label: 'Sustain', type: 'range', min: 0, max: 1, step: 0.01, param: 'sustain' }
        ],
        initialSettings: { level: 0.5, tone: 0.5, attack: 0.5, sustain: 0.5 }
    },
    {
        id: 'acoustic-simulator',
        name: 'Acoustic Simulator AC-3',
        imageUrl: 'img/acousticsimulator-ac3.png',
        controls: [
            { id: 'reverb-acoustic', label: 'Reverb', type: 'range', min: 0, max: 1, step: 0.01, param: 'reverb' },
            { id: 'level-acoustic', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'body-acoustic', label: 'Body', type: 'range', min: 0, max: 1, step: 0.01, param: 'body' },
            { id: 'top-acoustic', label: 'Top', type: 'range', min: 0, max: 1, step: 0.01, param: 'top' },
            {
                id: 'simulation-type', label: 'Simulation Type', type: 'select', options: [
                    { value: 'standard', label: 'Standard' },
                    { value: 'jumbo', label: 'Jumbo' },
                    { value: 'emanacy', label: 'Emanacy' },
                    { value: 'pizzo', label: 'Pizzo' }
                ], param: 'simulationType'
            }
        ],
        initialSettings: { reverb: 0.5, level: 0.5, body: 0.5, top: 0.5, simulationType: 'standard' }
    },
    {
        id: 'chorus-ce2w',
        name: 'Chorus CE-2w',
        imageUrl: 'img/chorus-ce2w.png',
        controls: [
            { id: 'rate-chorus', label: 'Rate', type: 'range', min: 0, max: 1, step: 0.01, param: 'rate' },
            { id: 'depth-chorus', label: 'Depth', type: 'range', min: 0, max: 1, step: 0.01, param: 'depth' },
            {
                id: 'mode-chorus', label: 'Mode', type: 'select', options: [
                    { value: 's', label: 'S' },
                    { value: 'ce', label: 'CE' },
                    { value: '-1', label: '-1' }
                ], param: 'mode'
            }
        ],
        initialSettings: { rate: 0.5, depth: 0.5, mode: 's' }
    },
    {
        id: 'super-chorus',
        name: 'Super Chorus CH-1',
        imageUrl: 'img/superchorus-ch1.png',
        controls: [
            { id: 'e-level-superchorus', label: 'E Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'eLevel' },
            { id: 'eq-lo-hi-superchorus', label: 'EQ (Lo to Hi)', type: 'range', min: 0, max: 1, step: 0.01, param: 'eqLoHi' },
            { id: 'rate-superchorus', label: 'Rate', type: 'range', min: 0, max: 1, step: 0.01, param: 'rate' },
            { id: 'depth-superchorus', label: 'Depth', type: 'range', min: 0, max: 1, step: 0.01, param: 'depth' }
        ],
        initialSettings: { eLevel: 0.5, eqLoHi: 0.5, rate: 0.5, depth: 0.5 }
    },
    {
        id: 'digital-delay',
        name: 'Digital Delay DD-7',
        imageUrl: 'img/digitaldelay-dd7.png',
        controls: [
            { id: 'e-level-digitaldelay', label: 'E.Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'eLevel' },
            { id: 'f-back-digitaldelay', label: 'F.Back', type: 'range', min: 0, max: 1, step: 0.01, param: 'fBack' },
            { id: 'd-time-digitaldelay', label: 'D.Time', type: 'range', min: 0, max: 1, step: 0.01, param: 'dTime' },
            {
                id: 'mode-digitaldelay', label: 'Mode', type: 'select', options: [
                    { value: '3200ms', label: '3200ms' },
                    { value: '800ms', label: '800ms' },
                    { value: '200ms', label: '200ms' },
                    { value: '50ms', label: '50ms' },
                    { value: 'hold', label: 'Hold' },
                    { value: 'modulate', label: 'Modulate' },
                    { value: 'analog', label: 'Analog' },
                    { value: 'reverse', label: 'Reverse' }
                ], param: 'mode'
            }
        ],
        initialSettings: { eLevel: 0.5, fBack: 0.5, dTime: 0.5, mode: '3200ms' }
    },
    {
        id: 'phase-shifter',
        name: 'Phase Shifter PH-3',
        imageUrl: 'img/phaseshifter-ph3.png',
        controls: [
            { id: 'rate-phaseshifter', label: 'Rate', type: 'range', min: 0, max: 1, step: 0.01, param: 'rate' },
            { id: 'depth-phaseshifter', label: 'Depth', type: 'range', min: 0, max: 1, step: 0.01, param: 'depth' },
            { id: 'res-phaseshifter', label: 'Res', type: 'range', min: 0, max: 1, step: 0.01, param: 'res' },
            {
                id: 'stage-phaseshifter', label: 'Stage', type: 'select', options: [
                    { value: '.', label: '.' },
                    { value: '8', label: '8' },
                    { value: '10', label: '10' },
                    { value: '12', label: '12' },
                    { value: 'fall', label: 'Fall' },
                    { value: 'rise', label: 'Rise' },
                    { value: 'step', label: 'Step' }
                ], param: 'stage'
            }
        ],
        initialSettings: { rate: 0.5, depth: 0.5, res: 0.5, stage: '.' }
    },
    {
        id: 'synthesizer-sy1',
        name: 'Synthesizer SY-1',
        imageUrl: 'img/synthesizer-sy1.png',
        controls: [
            { id: 'direct-synthesizer', label: 'Direct', type: 'range', min: 0, max: 1, step: 0.01, param: 'direct' },
            { id: 'effect-synthesizer', label: 'Effect', type: 'range', min: 0, max: 1, step: 0.01, param: 'effect' },
            { id: 'depth-synthesizer', label: 'Depth', type: 'range', min: 0, max: 1, step: 0.01, param: 'depth' },
            { id: 'tone-rate-synthesizer', label: 'Tone/Rate', type: 'range', min: 0, max: 1, step: 0.01, param: 'toneRate' },
            {
                id: 'variation-synthesizer', label: 'Variation', type: 'select', options: [
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                    { value: '6', label: '6' },
                    { value: '7', label: '7' },
                    { value: '8', label: '8' },
                    { value: '9', label: '9' },
                    { value: '10', label: '10' },
                    { value: '11', label: '11' },
                ], param: 'variation'
            },
            {
                id: 'type-synthesizer', label: 'Type', type: 'select', options: [
                    { value: 'lead', label: 'Lead' },
                    { value: 'pad', label: 'Pad' },
                    { value: 'bass', label: 'Bass' },
                    { value: 'str', label: 'Str.' },
                    { value: 'organ', label: 'Organ' },
                    { value: 'bell', label: 'Bell' },
                    { value: 'sfx', label: 'SFX' },
                    { value: 'seq', label: 'Seq' },
                ], param: 'type'
            },
        ],
        initialSettings: { direct: 0.5, effect: 0.5, depth: 0.5, toneRate: 0.5, variation: '1', type: 'lead' },
    },
    {
        id: 'blues-driver',
        name: 'Blues Driver BD-2',
        imageUrl: 'img/bluesdriver-bd2.png',
        controls: [
            { id: 'level-bluesdriver', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'tone-bluesdriver', label: 'Tone', type: 'range', min: 0, max: 1, step: 0.01, param: 'tone' },
            { id: 'gain-bluesdriver', label: 'Gain', type: 'range', min: 0, max: 1, step: 0.01, param: 'gain' },
        ],
        initialSettings: { level: 0.5, tone: 0.5, gain: 0.5 },
    },
    {
        id: 'equalizer-ge7',
        name: 'Equalizer GE-7',
        imageUrl: 'img/equalizer-ge7.png',
        controls: [
            { id: 'level-equalizer', label: 'Level', type: 'range', min: -15, max: 15, step: 0.1, param: 'level' },
            { id: 'freq-100', label: '100 Hz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq100' },
            { id: 'freq-200', label: '200 Hz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq200' },
            { id: 'freq-400', label: '400 Hz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq400' },
            { id: 'freq-800', label: '800 Hz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq800' },
            { id: 'freq-1.6k', label: '1.6 kHz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq1_6k' },
            { id: 'freq-3.2k', label: '3.2 kHz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq3_2k' },
            { id: 'freq-6.4k', label: '6.4 kHz', type: 'range', min: -15, max: 15, step: 0.1, param: 'freq6_4k' },
        ],
        initialSettings: { level: 0, freq100: 0, freq200: 0, freq400: 0, freq800: 0, freq1_6k: 0, freq3_2k: 0, freq6_4k: 0 },
    },
    {
        id: 'tremolo-tr2',
        name: 'Tremolo TR-2',
        imageUrl: 'img/tremolo-tr2.png',
        controls: [
            { id: 'rate-tremolo', label: 'Rate', type: 'range', min: 0, max: 1, step: 0.01, param: 'rate' },
            {
                id: 'wave-tremolo', label: 'Wave', type: 'select', options: [
                    { value: 'sine', label: 'Onda Inclinada' },
                    { value: 'square', label: 'Onda Reta' },
                ], param: 'wave'
            },
            { id: 'depth-tremolo', label: 'Depth', type: 'range', min: 0, max: 1, step: 0.01, param: 'depth' },
        ],
        initialSettings: { rate: 0.5, wave: 'sine', depth: 0.5 },
    },
    {
        id: 'fuzz-fz1w',
        name: 'Fuzz FZ-1W',
        imageUrl: 'img/fuzz-fz1w.png',
        controls: [
            { id: 'level-fuzz', label: 'Level', type: 'range', min: 0, max: 1, step: 0.01, param: 'level' },
            { id: 'tone-fuzz', label: 'Tone', type: 'range', min: 0, max: 1, step: 0.01, param: 'tone' },
            { id: 'fuzz-fuzz', label: 'Fuzz', type: 'range', min: 0, max: 1, step: 0.01, param: 'fuzz' },
            {
                id: 'mode-fuzz', label: 'Mode', type: 'select', options: [
                    { value: 'v', label: 'V' },
                    { value: 'm', label: 'M' },
                ], param: 'mode'
            },
        ],
        initialSettings: { level: 0.5, tone: 0.5, fuzz: 0.5, mode: 'v' },
    },
    {
        id: 'acoustic-preamp-ad2',
        name: 'Acoustic Preamp AD-2',
        imageUrl: 'img/acousticpreamp-ad2.png',
        controls: [
            { id: 'ambience-ad2', label: 'Ambience', type: 'range', min: 0, max: 1, step: 0.01, param: 'ambience' },
            { id: 'notch-ad2', label: 'Notch', type: 'range', min: 0, max: 1, step: 0.01, param: 'notch' },
            { id: 'resonance-ad2', label: 'Acoustic Resonance', type: 'range', min: 0, max: 1, step: 0.01, param: 'resonance' },
        ],
        initialSettings: { ambience: 0.5, notch: 0.5, resonance: 0.5 },
    },
];

// --- Funções para os Pedais ---

function createPedalElement(pedal) {
    const pedalElement = document.createElement('div');
    pedalElement.classList.add('pedal');
    pedalElement.id = pedal.id;

    // Adiciona a classe do pedal ao elemento para estilização
    pedalElement.classList.add(pedal.id);

    const img = document.createElement('img');
    img.src = pedal.imageUrl;
    img.alt = pedal.name;
    img.classList.add('pedal-img');
    pedalElement.appendChild(img);

    const title = document.createElement('h2');
    title.textContent = pedal.name;
    title.classList.add('tp');
    pedalElement.appendChild(title);

    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('controls');

    pedal.controls.forEach(control => {
        const controlGroup = document.createElement('div');
        controlGroup.classList.add('control-group');

        const label = document.createElement('label');
        label.textContent = control.label;
        label.htmlFor = control.id;
        controlGroup.appendChild(label);

        let input;
        if (control.type === 'range') {
            input = document.createElement('input');
            input.type = 'range';
            input.min = control.min;
            input.max = control.max;
            input.step = control.step;
            input.value = pedal.initialSettings[control.param];
            input.addEventListener('input', (event) => {
                const value = parseFloat(event.target.value);
                updatePedalControl(pedal.id, control.param, value);
            });
        } else if (control.type === 'select') {
            input = document.createElement('select');
            control.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                input.appendChild(optionElement);
            });
            input.value = pedal.initialSettings[control.param];
            input.addEventListener('change', (event) => {
                const value = event.target.value;
                updatePedalControl(pedal.id, control.param, value);
            });
        }

        input.id = control.id;
        input.classList.add('control');
        controlGroup.appendChild(input);
        controlsContainer.appendChild(controlGroup);
    });

    pedalElement.appendChild(controlsContainer);

    // Botão para adicionar/remover pedal do board
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Adicionar ao Pedalboard';
    toggleButton.addEventListener('click', () => {
        togglePedalOnBoard(pedal.id);
    });
    pedalElement.appendChild(toggleButton);

    return pedalElement;
}

function togglePedalOnBoard(pedalId) {
    const pedalIndex = selectedPedals.indexOf(pedalId);
    if (pedalIndex > -1) {
        selectedPedals.splice(pedalIndex, 1); // Remove o pedal do array
        removePedalFromBoard(pedalId);
    } else if (selectedPedals.length < maxPedals) {
        selectedPedals.push(pedalId); // Adiciona o pedal ao array
        addPedalToBoard(pedalId);
    } else {
        alert(`Você pode adicionar no máximo ${maxPedals} pedais ao seu pedalboard.`);
    }
}

function addPedalToBoard(pedalId) {
    const pedal = availablePedals.find(p => p.id === pedalId);
    if (!pedal) return;

    const pedalElement = createPedalElement(pedal);
    pedalElement.classList.add('active'); // Adiciona a classe para indicar que o pedal está ativo

    // Adiciona o botão de ligar/desligar
    const toggleButton = pedalElement.querySelector('button');
    toggleButton.textContent = 'Desligar'; // Muda o texto do botão
    toggleButton.onclick = () => {
        const isActive = pedalElement.classList.contains('active');
        if (isActive) {
            deactivatePedal(pedalId);
            pedalElement.classList.remove('active');
            toggleButton.textContent = 'Ligar';
        } else {
            activatePedal(pedalId);
            pedalElement.classList.add('active');
            toggleButton.textContent = 'Desligar';
        }
    };
    document.getElementById('pedalboard-container').appendChild(pedalElement);

    // Inicializa o efeito do pedal com Tone.js
    initializePedal(pedal.id);
}

function removePedalFromBoard(pedalId) {
    const pedalElement = document.getElementById(pedalId);
    if (pedalElement) {
        document.getElementById('pedalboard-container').removeChild(pedalElement);
        disconnectPedal(pedalId); // Desconecta os nós de áudio do pedal removido
    }
}


function initializePedal(pedalId) {
    const pedal = pedalData.find(p => p.id === pedalId);
    if (!pedal) return;

    // Verifica se o Tone.js já foi inicializado
    if (Tone.context.state !== 'running') {
        console.error('Tone.js não foi inicializado. Chame initTone() primeiro.');
        return;
    }

    // Cria uma nova instância para cada pedal
    const pedalInstance = {
        id: pedalId,
        nodes: {}
    };

    // Exemplo de criação de nós de áudio com Tone.js
    switch (pedalId) {
        case 'super-overdrive':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.filter = new Tone.Filter(pedal.initialSettings.tone, 'lowpass').connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.drive).connect(pedalInstance.nodes.filter);
            break;
        case 'distortion':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.filter = new Tone.Filter(pedal.initialSettings.tone, 'lowpass').connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.distortion).connect(pedalInstance.nodes.filter);
            break;
        case 'metal-zone':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.low = new Tone.Filter(pedal.initialSettings.low, 'lowshelf').connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.high = new Tone.Filter(pedal.initialSettings.high, 'highshelf').connect(pedalInstance.nodes.low);
            pedalInstance.nodes.middle = new Tone.Filter(pedal.initialSettings.middle, 'peaking').connect(pedalInstance.nodes.high);
            pedalInstance.nodes.midFreq = new Tone.BiquadFilter(pedal.initialSettings.midFreq, 'peaking').connect(pedalInstance.nodes.middle);
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.dist).connect(pedalInstance.nodes.midFreq);
            break;
        case 'metalcore':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.low = new Tone.Filter(pedal.initialSettings.low, 'lowshelf').connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.high = new Tone.Filter(pedal.initialSettings.high, 'highshelf').connect(pedalInstance.nodes.low);
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.distortion).connect(pedalInstance.nodes.high);
            break;
        case 'compression-sustainer':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.filter = new Tone.Filter(pedal.initialSettings.tone, 'lowpass').connect(pedalInstance.nodes.gain);
            // Compressor é um pouco mais complexo e pode não ter um mapeamento direto para um único parâmetro
            // Aqui você pode precisar ajustar os parâmetros do compressor com base em 'attack'
            pedalInstance.nodes.compressor = new Tone.Compressor({
                attack: pedal.initialSettings.attack,
                release: pedal.initialSettings.sustain, // Usando 'sustain' como 'release'
                threshold: -24, // Um valor padrão, ajuste conforme necessário
                ratio: 12, // Um valor padrão, ajuste conforme necessário
                knee: 30 // Um valor padrão, ajuste conforme necessário
            }).connect(pedalInstance.nodes.filter);
            break;
        case 'acoustic-simulator':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.reverb = new Tone.Reverb(pedal.initialSettings.reverb).connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.filter = new Tone.Filter(pedal.initialSettings.body, 'bandpass').connect(pedalInstance.nodes.reverb);
            // 'top' pode ser mapeado para um filtro highshelf para simular a clareza do som acústico
            pedalInstance.nodes.highShelf = new Tone.Filter(pedal.initialSettings.top, 'highshelf').connect(pedalInstance.nodes.filter);
            break;
        case 'chorus-ce2w':
            pedalInstance.nodes.chorus = new Tone.Chorus({
                frequency: pedal.initialSettings.rate, // 'rate' mapeado para 'frequency'
                depth: pedal.initialSettings.depth,
                type: pedal.initialSettings.mode // 'mode' pode ser mapeado para 'type' se usarmos 'sine', 'square', etc.
            }).connect(outputNode);
            break;
        case 'super-chorus':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.eLevel).connect(outputNode);
            pedalInstance.nodes.eq = new Tone.EQ3(pedal.initialSettings.eqLoHi, 0, 0).connect(pedalInstance.nodes.gain); // EQ para low/high
            pedalInstance.nodes.chorus = new Tone.Chorus({
                frequency: pedal.initialSettings.rate,
                depth: pedal.initialSettings.depth
            }).connect(pedalInstance.nodes.eq);
            break;
        case 'digital-delay':
            pedalInstance.nodes.feedbackDelay = new Tone.FeedbackDelay({
                delayTime: pedal.initialSettings.dTime,
                feedback: pedal.initialSettings.fBack
            }).connect(outputNode);
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.eLevel).connect(pedalInstance.nodes.feedbackDelay);

            // Mapeamento do parâmetro 'mode' para diferentes configurações de delay
            switch (pedal.initialSettings.mode) {
                case '3200ms':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 1;
                    break;
                case '800ms':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 0.8;
                    break;
                case '200ms':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 0.2;
                    break;
                case '50ms':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 0.05;
                    break;
                case 'hold':
                    break;
                case 'modulate':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 0.1;
                    break;
                case 'analog':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 0.6;
                    break;
                case 'reverse':
                    pedalInstance.nodes.feedbackDelay.delayTime.value = 0.2;
                    break;
            }
            break;
        case 'phase-shifter':
            pedalInstance.nodes.phaser = new Tone.Phaser({
                frequency: pedal.initialSettings.rate,
                depth: pedal.initialSettings.depth,
                baseFrequency: pedal.initialSettings.res
            }).connect(outputNode);
            break;
        case 'synthesizer-sy1':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.direct).connect(outputNode);
            // Efeito synth é complexo e pode exigir uma combinação de osciladores, filtros, envelopes, etc.
            // Aqui você precisará de uma lógica mais detalhada para mapear os parâmetros para o efeito synth desejado
            break;
        case 'blues-driver':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.filter = new Tone.Filter(pedal.initialSettings.tone, 'lowpass').connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.distortion = new Tone.Distortion(pedal.initialSettings.gain).connect(pedalInstance.nodes.filter);
            break;
        case 'equalizer-ge7':
            // Equalizer requer uma cadeia de filtros biquad, um para cada banda de frequência
            const freqs = ['freq100', 'freq200', 'freq400', 'freq800', 'freq1_6k', 'freq3_2k', 'freq6_4k'];
            pedalInstance.nodes.filters = freqs.map(freq => {
                const filter = new Tone.BiquadFilter(pedal.initialSettings[freq], 'peaking');
                if (freq === 'freq100') {
                    filter.frequency.value = 100;
                } else if (freq === 'freq200') {
                    filter.frequency.value = 200;
                } else if (freq === 'freq400') {
                    filter.frequency.value = 400;
                } else if (freq === 'freq800') {
                    filter.frequency.value = 800;
                } else if (freq === 'freq1_6k') {
                    filter.frequency.value = 1600;
                } else if (freq === 'freq3_2k') {
                    filter.frequency.value = 3200;
                } else if (freq === 'freq6_4k') {
                    filter.frequency.value = 6400;
                }
                return filter;
            });

            // Conectar os filtros em série
            for (let i = 0; i < pedalInstance.nodes.filters.length - 1; i++) {
                pedalInstance.nodes.filters[i].connect(pedalInstance.nodes.filters[i + 1]);
            }

            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(pedalInstance.nodes.filters[0]);
            pedalInstance.nodes.filters[pedalInstance.nodes.filters.length - 1].connect(outputNode);
            break;
        case 'tremolo-tr2':
            pedalInstance.nodes.tremolo = new Tone.Tremolo({
                frequency: pedal.initialSettings.rate,
                depth: pedal.initialSettings.depth,
                type: pedal.initialSettings.wave
            }).connect(outputNode).start();
            break;
        case 'fuzz-fz1w':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.filter = new Tone.Filter(pedal.initialSettings.tone, 'lowpass').connect(pedalInstance.nodes.gain);
            pedalInstance.nodes.fuzz = new Tone.Distortion(pedal.initialSettings.fuzz).connect(pedalInstance.nodes.filter);

            // Mapeamento do parâmetro 'mode' para diferentes configurações de fuzz
            switch (pedal.initialSettings.mode) {
                case 'v':
                    pedalInstance.nodes.fuzz.distortion = 0.6;
                    break;
                case 'm':
                    pedalInstance.nodes.fuzz.distortion = 0.9;
                    break;
            }
            break;
        case 'acoustic-preamp-ad2':
            pedalInstance.nodes.gain = new Tone.Gain(pedal.initialSettings.level).connect(outputNode);
            pedalInstance.nodes.reverb = new Tone.Reverb(pedal.initialSettings.ambience).connect(pedalInstance.nodes.gain);
            // 'notch' pode ser implementado com um filtro notch ou um equalizador paramétrico
            pedalInstance.nodes.notchFilter = new Tone.BiquadFilter(pedal.initialSettings.notch, 'notch').connect(pedalInstance.nodes.reverb);
            // 'resonance' pode ser simulado com um filtro ou um efeito de ressonância
            pedalInstance.nodes.resonance = new Tone.BiquadFilter(pedal.initialSettings.resonance, 'lowpass').connect(pedalInstance.nodes.notchFilter);
            break;
        default:
            console.warn(`Pedal ${pedalId} não possui configuração de áudio definida.`);
            break;
    }

    availablePedals.push(pedalInstance);
}

function activatePedal(pedalId) {
    const pedal = availablePedals.find(p => p.id === pedalId);
    if (!pedal) return;

    // Conectar o pedal à cadeia de áudio
    inputNode.connect(pedal.nodes[Object.keys(pedal.nodes)[0]]); // Conecta ao primeiro nó do pedal
    const lastNodeKey = Object.keys(pedal.nodes)[Object.keys(pedal.nodes).length - 1];
    pedal.nodes[lastNodeKey].connect(outputNode); // Conecta o último nó do pedal à saída
}

function deactivatePedal(pedalId) {
    const pedal = availablePedals.find(p => p.id === pedalId);
    if (!pedal) return;

    // Desconectar o pedal da cadeia de áudio
    inputNode.disconnect(pedal.nodes[Object.keys(pedal.nodes)[0]]);
    const lastNodeKey = Object.keys(pedal.nodes)[Object.keys(pedal.nodes).length - 1];
    pedal.nodes[lastNodeKey].disconnect(outputNode);
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
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        outputNode = audioContext.createGain();
        outputNode.connect(audioContext.destination);
    }

    // Inicia o Tone.js e define o contexto
    if (Tone.context.state !== 'running') {
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
        // Se não houver pedais selecionados, conecta a entrada diretamente à saída
        inputNode.connect(outputNode);
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

// --- Afinador ---

const tuner = new Tone.Analyser('waveform', 1024);
let tunerStream;

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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    tunerStream = audioContext.createMediaStreamSource(stream);
    tunerStream.connect(tuner);

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

document.getElementById('recordBtn').addEventListener('click', async () => {
if (!recording) {
    if (!recorder) {
        initializeRecorder();
    }
    try {
        await Tone.start(); // Certifica-se de que o contexto de áudio está pronto
        recorder.start();
        recording = true;
        document.getElementById('recordBtn').textContent = 'Parar Gravação';
    } catch (err) {
        console.error('Erro ao iniciar a gravação:', err);
    }
} else {
    stopRecording();
}
});

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

document.getElementById('stopBtn').addEventListener('click', stopRecording);

// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
const initAudioButton = document.getElementById('init-audio');
initAudioButton.addEventListener('click', initAudio);
});


function disconnectPedal(pedalId) {
    const pedal = availablePedals.find(p => p.id === pedalId);
    if (!pedal) return;

    // Desconecta todos os nós associados ao pedal
    for (const nodeName in pedal.nodes) {
        const node = pedal.nodes[nodeName];
        if (node && typeof node.disconnect === 'function') {
            node.disconnect();
        }
    }

    // Opcional: Redefinir os nós para um estado padrão ou vazio
    pedal.nodes = {};

    // Reconecta a entrada ao amplificador, se não houver mais pedais ativos
    if (selectedPedals.length === 0) {
        inputNode.connect(ampNode);
    } else {
        // Se ainda houver pedais ativos, reconecta-os
        connectPedalsToInputOutput();
    }
}

// Função modificada para conectar pedais em série
function connectPedalsToInputOutput() {
    // Desconecta a entrada de qualquer nó anterior
    inputNode.disconnect();

    // Desconecta a saída do último pedal, se existir, do amplificador
    if (selectedPedals.length > 0) {
        const lastPedalId = selectedPedals[selectedPedals.length - 1];
        const lastPedal = availablePedals.find(p => p.id === lastPedalId);
        const lastNodeKey = Object.keys(lastPedal.nodes)[Object.keys(lastPedal.nodes).length - 1];
        lastPedal.nodes[lastNodeKey].disconnect();
    }

    // Conecta a entrada ao primeiro pedal
    if (selectedPedals.length > 0) {
        const firstPedalId = selectedPedals[0];
        const firstPedal = availablePedals.find(p => p.id === firstPedalId);
        inputNode.connect(firstPedal.nodes[Object.keys(firstPedal.nodes)[0]]);

        // Conecta os pedais em série
        for (let i = 0; i < selectedPedals.length - 1; i++) {
            const currentPedal = availablePedals.find(p => p.id === selectedPedals[i]);
            const nextPedal = availablePedals.find(p => p.id === selectedPedals[i + 1]);
            const lastNodeKey = Object.keys(currentPedal.nodes)[Object.keys(currentPedal.nodes).length - 1];
            const firstNodeKey = Object.keys(nextPedal.nodes)[0];
            currentPedal.nodes[lastNodeKey].connect(nextPedal.nodes[firstNodeKey]);
        }

        // Conecta o último pedal ao amplificador
        const lastPedalId = selectedPedals[selectedPedals.length - 1];
        const lastPedal = availablePedals.find(p => p.id === lastPedalId);
        const lastNodeKey = Object.keys(lastPedal.nodes)[Object.keys(lastPedal.nodes).length - 1];
        lastPedal.nodes[lastNodeKey].connect(ampNode);
    } else {
        // Se não houver pedais selecionados, conecta a entrada diretamente ao amplificador
        inputNode.connect(ampNode);
    }
}

// Modifique a função togglePedalOnBoard para chamar connectPedalsToInputOutput
function togglePedalOnBoard(pedalId) {
    const pedalIndex = selectedPedals.indexOf(pedalId);
    if (pedalIndex > -1) {
        selectedPedals.splice(pedalIndex, 1);
        removePedalFromBoard(pedalId);
    } else if (selectedPedals.length < maxPedals) {
        selectedPedals.push(pedalId);
        addPedalToBoard(pedalId);
    } else {
        alert(`Você pode adicionar no máximo ${maxPedals} pedais ao seu pedalboard.`);
    }
    connectPedalsToInputOutput(); // Reconecta os pedais sempre que um pedal é adicionado ou removido
}

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

// --- Inicialização ---
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

connectPedalsToInputOutput();
initializeAmplifier();
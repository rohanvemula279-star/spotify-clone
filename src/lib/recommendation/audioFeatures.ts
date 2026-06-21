import type { AudioFeatures } from "./types";

const audioContext = typeof window !== "undefined"
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null;

export async function extractFeatures(
  audioUrl: string,
  durationSec: number = 30
): Promise<AudioFeatures> {
  if (!audioContext) {
    return defaultFeatures();
  }

  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return analyzeBuffer(audioBuffer);
  } catch {
    return defaultFeatures();
  }
}

function analyzeBuffer(buffer: AudioBuffer): AudioFeatures {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const totalSamples = channelData.length;

  const tempo = estimateTempo(channelData, sampleRate);
  const energy = computeEnergy(channelData);
  const spectralCentroid = computeSpectralCentroid(channelData, sampleRate);
  const zeroCrossingRate = computeZeroCrossingRate(channelData);

  const loudness = computeLoudness(channelData);

  const lowFreqEnergy = bandEnergy(channelData, sampleRate, 0, 250);
  const midFreqEnergy = bandEnergy(channelData, sampleRate, 250, 2000);
  const highFreqEnergy = bandEnergy(channelData, sampleRate, 2000, 8000);

  const total = lowFreqEnergy + midFreqEnergy + highFreqEnergy || 1;
  const acousticness = Math.min(1, (lowFreqEnergy + highFreqEnergy) / total);
  const speechiness = computeSpeechiness(channelData, sampleRate);
  const instrumentalness = computeInstrumentalness(channelData, sampleRate);
  const danceability = computeDanceability(channelData, sampleRate, tempo);
  const valence = computeValence(channelData, spectralCentroid, zeroCrossingRate);

  return {
    tempo: Math.round(tempo),
    energy: clamp01(energy),
    valence: clamp01(valence),
    danceability: clamp01(danceability),
    acousticness: clamp01(acousticness),
    instrumentalness: clamp01(instrumentalness),
    loudness: clamp01(loudness),
    speechiness: clamp01(speechiness),
    spectralCentroid: clamp01(spectralCentroid / sampleRate),
    zeroCrossingRate: clamp01(zeroCrossingRate),
  };
}

function estimateTempo(data: Float32Array, sr: number): number {
  const hop = Math.floor(sr * 0.02);
  const windowSize = Math.floor(sr * 0.05);
  const onsetStrength = computeOnsetStrength(data, hop, windowSize);
  const acf = autocorrelation(onsetStrength);
  const bpm = 60 / (findFirstPeak(acf) * (hop / sr));
  return bpm > 200 ? bpm / 2 : bpm < 60 ? bpm * 2 : bpm;
}

function computeOnsetStrength(
  data: Float32Array,
  hop: number,
  win: number
): number[] {
  const strength: number[] = [];
  for (let i = win; i < data.length - win; i += hop) {
    let sum = 0;
    for (let j = 0; j < win; j++) {
      const diff = data[i + j] - data[i + j - win];
      sum += diff > 0 ? diff * diff : 0;
    }
    strength.push(Math.sqrt(sum / win));
  }
  return strength;
}

function autocorrelation(signal: number[]): number[] {
  const n = signal.length;
  const result: number[] = [];
  for (let lag = 0; lag < Math.min(n, 500); lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += signal[i] * signal[i + lag];
    }
    result.push(sum);
  }
  return result;
}

function findFirstPeak(signal: number[]): number {
  for (let i = 10; i < signal.length; i++) {
    if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
      return i;
    }
  }
  return 50;
}

function computeEnergy(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.min(1, Math.sqrt(sum / data.length) * 5);
}

function computeSpectralCentroid(
  data: Float32Array,
  sr: number
): number {
  const fftSize = 2048;
  const hop = Math.floor(sr * 0.01);
  let totalCentroid = 0;
  let frames = 0;

  for (let i = 0; i < data.length - fftSize; i += hop) {
    const frame = data.slice(i, i + fftSize);
    const spectrum = fftMagnitudes(frame);
    let weightedSum = 0;
    let magSum = 0;
    for (let j = 0; j < spectrum.length; j++) {
      const freq = (j * sr) / fftSize;
      weightedSum += freq * spectrum[j];
      magSum += spectrum[j];
    }
    if (magSum > 0) {
      totalCentroid += weightedSum / magSum;
      frames++;
    }
  }
  return frames > 0 ? totalCentroid / frames : 1000;
}

function fftMagnitudes(frame: Float32Array): Float64Array {
  const n = frame.length;
  const real = new Float64Array(n);
  const imag = new Float64Array(n);
  for (let i = 0; i < n; i++) real[i] = frame[i];

  const mags = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mags;
}

function computeZeroCrossingRate(data: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i] >= 0 !== data[i - 1] >= 0) crossings++;
  }
  return crossings / data.length;
}

function computeLoudness(data: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    sumSquares += data[i] * data[i];
  }
  const rms = Math.sqrt(sumSquares / data.length);
  return Math.min(1, rms * 10);
}

function bandEnergy(
  data: Float32Array,
  sr: number,
  lowHz: number,
  highHz: number
): number {
  const fftSize = 2048;
  const hop = Math.floor(sr * 0.01);
  let totalEnergy = 0;
  let frames = 0;

  for (let i = 0; i < data.length - fftSize; i += hop) {
    const frame = data.slice(i, i + fftSize);
    const spectrum = fftMagnitudes(frame);
    let bandSum = 0;
    for (let j = 0; j < spectrum.length; j++) {
      const freq = (j * sr) / fftSize;
      if (freq >= lowHz && freq <= highHz) {
        bandSum += spectrum[j] * spectrum[j];
      }
    }
    totalEnergy += bandSum;
    frames++;
  }
  return frames > 0 ? totalEnergy / frames : 0;
}

function computeSpeechiness(
  data: Float32Array,
  sr: number
): number {
  const fftSize = 1024;
  const hop = sr * 0.01;
  let highFreqRatioSum = 0;
  let frames = 0;

  for (let i = 0; i < data.length - fftSize; i += hop) {
    const frame = data.slice(i, i + fftSize);
    const spectrum = fftMagnitudes(frame);
    let highSum = 0;
    let totalSum = 0;
    for (let j = 0; j < spectrum.length; j++) {
      const freq = (j * sr) / fftSize;
      totalSum += spectrum[j];
      if (freq > 4000) highSum += spectrum[j];
    }
    if (totalSum > 0) {
      highFreqRatioSum += highSum / totalSum;
      frames++;
    }
  }
  return frames > 0 ? highFreqRatioSum / frames : 0;
}

function computeInstrumentalness(
  data: Float32Array,
  sr: number
): number {
  const fftSize = 2048;
  const hop = sr * 0.02;
  let voiceBandRatio = 0;
  let frames = 0;

  for (let i = 0; i < data.length - fftSize; i += hop) {
    const frame = data.slice(i, i + fftSize);
    const spectrum = fftMagnitudes(frame);
    let voiceSum = 0;
    let totalSum = 0;
    for (let j = 0; j < spectrum.length; j++) {
      const freq = (j * sr) / fftSize;
      totalSum += spectrum[j];
      if (freq >= 300 && freq <= 3400) {
        voiceSum += spectrum[j];
      }
    }
    if (totalSum > 0) {
      voiceBandRatio += voiceSum / totalSum;
      frames++;
    }
  }
  const avgVoiceRatio = frames > 0 ? voiceBandRatio / frames : 0.5;
  return 1 - Math.min(1, avgVoiceRatio * 1.5);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

function melFilterbank(
  nFilters: number,
  fftSize: number,
  sampleRate: number
): Float64Array[] {
  const lowMel = hzToMel(0);
  const highMel = hzToMel(sampleRate / 2);
  const melPoints = new Float64Array(nFilters + 2);
  for (let i = 0; i < nFilters + 2; i++) {
    melPoints[i] = lowMel + (i * (highMel - lowMel)) / (nFilters + 1);
  }

  const binFreqs = new Float64Array(fftSize / 2 + 1);
  for (let i = 0; i < binFreqs.length; i++) {
    binFreqs[i] = (i * sampleRate) / fftSize;
  }

  const filters: Float64Array[] = [];
  for (let m = 0; m < nFilters; m++) {
    const filter = new Float64Array(binFreqs.length);
    const leftMel = melPoints[m];
    const centerMel = melPoints[m + 1];
    const rightMel = melPoints[m + 2];
    const leftHz = melToHz(leftMel);
    const centerHz = melToHz(centerMel);
    const rightHz = melToHz(rightMel);

    for (let i = 0; i < binFreqs.length; i++) {
      const f = binFreqs[i];
      if (f >= leftHz && f <= centerHz) {
        filter[i] = centerHz > leftHz ? (f - leftHz) / (centerHz - leftHz) : 1;
      } else if (f > centerHz && f <= rightHz) {
        filter[i] = rightHz > centerHz ? (rightHz - f) / (rightHz - centerHz) : 0;
      }
    }
    filters.push(filter);
  }
  return filters;
}

export function computeMelFeatures(
  data: Float32Array,
  sampleRate: number
): number[] {
  const nFilters = 20;
  const fftSize = 2048;
  const hop = Math.floor(sampleRate * 0.01);
  const filters = melFilterbank(nFilters, fftSize, sampleRate);
  const nFrames = Math.max(
    1,
    Math.floor((data.length - fftSize) / hop)
  );

  const melEnergies = new Float64Array(nFilters);
  let frameCount = 0;

  for (let i = 0; i < data.length - fftSize && frameCount < 50; i += hop) {
    const frame = data.slice(i, i + fftSize);
    const spectrum = fftMagnitudes(frame);
    for (let m = 0; m < nFilters; m++) {
      let energy = 0;
      for (let j = 0; j < spectrum.length && j < filters[m].length; j++) {
        energy += spectrum[j] * spectrum[j] * filters[m][j];
      }
      melEnergies[m] += Math.log(Math.max(1e-10, energy));
    }
    frameCount++;
  }

  const result: number[] = [];
  for (let m = 0; m < nFilters; m++) {
    const avg = melEnergies[m] / frameCount;
    const normalized = clamp01((avg + 10) / 20);
    result.push(normalized);
  }
  return result;
}

export function extractMelSpectrogram(
  audioUrl: string
): Promise<number[]> {
  return extractFeatures(audioUrl).then((f) => {
    return [
      f.tempo / 200,
      f.energy,
      f.valence,
      f.danceability,
      f.acousticness,
      f.instrumentalness,
      f.loudness,
      f.speechiness,
    ];
  });
}

function computeDanceability(
  data: Float32Array,
  sr: number,
  tempo: number
): number {
  const hop = Math.floor(sr * 0.02);
  const onsetStrength = computeOnsetStrength(data, hop, 1024);
  const acf = autocorrelation(onsetStrength);

  let regularity = 0;
  for (let i = 1; i < Math.min(10, acf.length); i++) {
    regularity += Math.abs(acf[i]);
  }
  regularity /= Math.min(10, acf.length);

  const tempoScore = tempo >= 90 && tempo <= 130 ? 1
    : tempo >= 80 && tempo <= 140 ? 0.8
    : tempo >= 70 && tempo <= 160 ? 0.5
    : 0.3;

  return (regularity * 0.5 + tempoScore * 0.5);
}

function computeValence(
  data: Float32Array,
  centroid: number,
  zcr: number
): number {
  const centroidScore = 1 - Math.min(1, centroid / 5000);
  const zcrScore = zcr < 0.1 ? 1 : zcr < 0.2 ? 0.7 : 0.3;
  const highEnergyRatio = bandEnergyRatio(data, 5000, 20000);

  return centroidScore * 0.3 + zcrScore * 0.3 + highEnergyRatio * 0.4;
}

function bandEnergyRatio(
  data: Float32Array,
  lowHz: number,
  highHz: number
): number {
  const sr = data.length > 0 ? 44100 : 44100;
  const fftSize = 2048;
  const hop = Math.floor(sr * 0.01);
  let totalEnergy = 0;
  let highEnergy = 0;
  let frames = 0;

  for (let i = 0; i < Math.min(data.length - fftSize, fftSize * 20); i += hop) {
    const frame = data.slice(i, i + fftSize);
    const spectrum = fftMagnitudes(frame);
    let highSum = 0;
    let totalSum = 0;
    for (let j = 0; j < spectrum.length; j++) {
      const freq = (j * sr) / fftSize;
      totalSum += spectrum[j];
      if (freq >= lowHz) highSum += spectrum[j];
    }
    totalEnergy += totalSum;
    highEnergy += highSum;
    frames++;
  }
  return frames > 0 && totalEnergy > 0 ? highEnergy / totalEnergy : 0.5;
}

export function defaultFeatures(): AudioFeatures {
  return {
    tempo: 120,
    energy: 0.5,
    valence: 0.5,
    danceability: 0.5,
    acousticness: 0.5,
    instrumentalness: 0.3,
    loudness: 0.6,
    speechiness: 0.1,
    spectralCentroid: 0.2,
    zeroCrossingRate: 0.05,
  };
}

export function inferFeaturesFromTrack(track: {
  name: string;
  artist: string;
  album: string;
}): AudioFeatures {
  const nameL = track.name.toLowerCase();
  const artistL = track.artist.toLowerCase();
  const albumL = track.album.toLowerCase();

  const acousticKeywords = ["acoustic", "unplugged", "stripped", "live", "session", "raw"];
  const energyKeywords = ["remix", "club", "extended", "dance", "edit", "mix", "mass", "item"];
  const chillKeywords = ["chill", "lofi", "calm", "peaceful", "ambient", "sleep", "rain", "melody"];
  const sadKeywords = ["sad", "alone", "cry", "heartbreak", "tears", "broken", "lonely"];
  const happyKeywords = ["happy", "joy", "sunshine", "smile", "party", "celebrate", "love"];
  const teluguKeywords = ["telugu", "tollywood", "sp balasubrahmanyam", "devi sri prasad", "thaman"];

  const all = `${nameL} ${artistL} ${albumL}`;

  const acousticScore = acousticKeywords.some((k) => all.includes(k)) ? 0.7 : 0.4;
  const energyScore = energyKeywords.some((k) => all.includes(k)) ? 0.8 : 0.4;
  const chillScore = chillKeywords.some((k) => all.includes(k)) ? 0.7 : 0.3;
  const sadScore = sadKeywords.some((k) => all.includes(k)) ? 0.6 : 0.3;
  const happyScore = happyKeywords.some((k) => all.includes(k)) ? 0.7 : 0.4;
  const isTelugu = teluguKeywords.some((k) => all.includes(k));

  return {
    tempo: isTelugu ? 120 : chillScore > 0.5 ? 85 : energyScore > 0.5 ? 130 : 110,
    energy: isTelugu ? 0.65 : energyScore > 0.5 ? 0.8 : acousticScore > 0.5 ? 0.3 : 0.5,
    valence: isTelugu ? 0.6 : happyScore > 0.5 ? 0.8 : sadScore > 0.5 ? 0.2 : 0.5,
    danceability: isTelugu ? 0.7 : energyScore > 0.5 ? 0.8 : chillScore > 0.5 ? 0.4 : 0.6,
    acousticness: isTelugu ? 0.5 : acousticScore,
    instrumentalness: isTelugu ? 0.3 : chillScore > 0.5 ? 0.6 : 0.2,
    loudness: isTelugu ? 0.65 : energyScore > 0.5 ? 0.8 : 0.4,
    speechiness: 0.08,
    spectralCentroid: 0.15,
    zeroCrossingRate: 0.04,
  };
}

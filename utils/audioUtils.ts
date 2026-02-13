// Base64 decoding helper
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Audio decoding helper
export async function decodeAudioData(
  base64String: string,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const bytes = decodeBase64(base64String);
  
  // Create a view to interpret the bytes as 16-bit integers (PCM)
  const dataInt16 = new Int16Array(bytes.buffer);
  
  // Create the AudioBuffer
  const buffer = ctx.createBuffer(numChannels, dataInt16.length / numChannels, sampleRate);
  
  // Fill the buffer with normalized float data (-1.0 to 1.0)
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < channelData.length; i++) {
      // Convert PCM 16-bit to Float32
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}
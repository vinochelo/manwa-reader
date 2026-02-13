export enum ProcessingState {
  IDLE = 'IDLE',
  ANALYZING_BOOK = 'ANALYZING_BOOK',
  EXTRACTING = 'EXTRACTING',
  TRANSLATING = 'TRANSLATING',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}

export interface Chapter {
  number?: string | number;
  title: string;
  url: string;
}

export interface BookDetails {
  title: string;
  description?: string;
  coverImage?: string;
  totalChaptersFound?: number;
  chapters: Chapter[];
}

export interface StoryContent {
  title: string;
  originalText?: string;
  translatedText: string;
  audioBuffer?: AudioBuffer;
}

export type InputMode = 'url' | 'text';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
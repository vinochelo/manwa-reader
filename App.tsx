import React, { useState, useRef, useEffect, useCallback } from 'react';
import { processContent, generateSpeechFromText, fetchBookDetails, setCustomApiKey, getCustomApiKey } from './services/geminiService';
import { decodeAudioData } from './utils/audioUtils';
import { ProcessingState, StoryContent, InputMode, BookDetails } from './types';
import { Spinner } from './components/Spinner';

// Icons
const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
);
const TextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const HeadphoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
);
const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
);
const GearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

const STORAGE_KEY = 'manhwa_reader_book';
const LAST_CHAPTER_KEY = 'manhwa_reader_last_chapter';

const App: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState<ProcessingState>(ProcessingState.IDLE);
  
  // Data State
  const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
  const [currentStory, setCurrentStory] = useState<StoryContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false); 

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getCustomApiKey() || '');
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize AudioContext
  useEffect(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // PERSISTENCE: Load from local storage
  useEffect(() => {
    try {
      const savedBook = localStorage.getItem(STORAGE_KEY);
      if (savedBook) setBookDetails(JSON.parse(savedBook));
      
      const savedChapter = localStorage.getItem(LAST_CHAPTER_KEY);
      if (savedChapter) setCurrentStory(JSON.parse(savedChapter));
    } catch (e) {
      console.error("Error loading saved data", e);
    }
  }, []);

  // PERSISTENCE: Save bookDetails
  useEffect(() => {
    if (bookDetails) localStorage.setItem(STORAGE_KEY, JSON.stringify(bookDetails));
  }, [bookDetails]);

  // PERSISTENCE: Save currentStory
  useEffect(() => {
    if (currentStory && bookDetails) {
      const { audioBuffer, ...storyToSave } = currentStory;
      localStorage.setItem(LAST_CHAPTER_KEY, JSON.stringify(storyToSave));
    } else if (!currentStory) {
      localStorage.removeItem(LAST_CHAPTER_KEY);
    }
  }, [currentStory, bookDetails]);

  const clearSavedData = () => {
    if(window.confirm("¿Estás seguro de que quieres borrar el libro guardado?")) {
        setBookDetails(null);
        setCurrentStory(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LAST_CHAPTER_KEY);
        setInputText("");
    }
  };

  const saveSettings = () => {
      setCustomApiKey(apiKeyInput.trim());
      setShowSettings(false);
      setError(null);
  };

  const handleError = (err: any) => {
      let msg = err.message || "Error desconocido";
      if (msg.includes('API Key') || msg.includes('400')) {
          msg = "API Key inválida. Por favor, abre Ajustes (icono engranaje) y pega tu clave API.";
          setShowSettings(true);
      }
      setError(msg);
      setState(ProcessingState.ERROR);
  };

  // 1. Analyze Book
  const handleAnalyzeBook = async () => {
    if (!inputText.trim()) return;
    try {
      setState(ProcessingState.ANALYZING_BOOK);
      setError(null);
      setBookDetails(null);
      setCurrentStory(null);
      stopAudio();

      const details = await fetchBookDetails(inputText);
      setBookDetails(details);
      setState(ProcessingState.IDLE);
    } catch (err: any) {
      handleError(err);
    }
  };

  // 2. Process Specific Chapter
  const handleProcessChapter = async (url: string, title?: string) => {
    try {
      setState(ProcessingState.EXTRACTING);
      setError(null);
      setCurrentStory(null);
      setShowOriginal(false);
      stopAudio();

      window.scrollTo({ top: 0, behavior: 'smooth' });

      const result = await processContent(url, 'url');
      if (title && result.title === "Capítulo") {
        result.title = title;
      }
      setCurrentStory(result);
      setState(ProcessingState.IDLE);
    } catch (err: any) {
      handleError(err);
    }
  };

  // 3. Process Text Direct
  const handleProcessText = async () => {
    if (!inputText.trim()) return;
    try {
      setState(ProcessingState.EXTRACTING);
      setError(null);
      setCurrentStory(null);
      setShowOriginal(false);
      stopAudio();

      const result = await processContent(inputText, 'text');
      setCurrentStory(result);
      setState(ProcessingState.IDLE);
    } catch (err: any) {
      handleError(err);
    }
  };

  const handleGenerateAudio = async () => {
    if (!currentStory || !currentStory.translatedText) return;

    try {
      setState(ProcessingState.GENERATING_AUDIO);
      const base64Audio = await generateSpeechFromText(currentStory.translatedText);
      
      if (audioContextRef.current) {
        const buffer = await decodeAudioData(base64Audio, audioContextRef.current);
        setCurrentStory(prev => prev ? { ...prev, audioBuffer: buffer } : null);
        playAudio(buffer);
      }
    } catch (err: any) {
      handleError(err);
    }
  };

  const playAudio = useCallback((buffer: AudioBuffer, offset: number = 0) => {
    if (!audioContextRef.current) return;
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0, offset);
    sourceNodeRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    setState(ProcessingState.PLAYING);
  }, []);

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setState(ProcessingState.PAUSED);
    }
  };

  const resumeAudio = () => {
    if (currentStory?.audioBuffer) {
      playAudio(currentStory.audioBuffer, pauseTimeRef.current);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
    }
    pauseTimeRef.current = 0;
    if (state === ProcessingState.PLAYING || state === ProcessingState.PAUSED) {
        setState(ProcessingState.IDLE);
    }
  };

  const handleTogglePlay = () => {
    if (state === ProcessingState.PLAYING) {
      pauseAudio();
    } else if (state === ProcessingState.PAUSED) {
      resumeAudio();
    } else if (currentStory?.audioBuffer) {
      playAudio(currentStory.audioBuffer, 0);
    } else {
      handleGenerateAudio();
    }
  };

  const handleBackToChapters = () => {
    setCurrentStory(null);
    stopAudio();
    setState(ProcessingState.IDLE);
  };

  const handleUseExample = () => {
    setInputMode('url');
    setInputText('https://novellive.app/book/reborn-before-the-frozen-apocalypse-i-stock-resources-worth-billions/6');
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative">
      
      {/* Header */}
      <header className="text-center mb-10 space-y-2 relative w-full flex flex-col items-center">
        <button 
            onClick={() => setShowSettings(true)}
            className="absolute right-0 top-0 p-2 text-gray-500 hover:text-white transition-colors"
            title="Ajustes API Key"
        >
            <GearIcon />
        </button>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Manhwa Reader AI
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          {bookDetails ? `Leyendo: ${bookDetails.title}` : "Extrae, traduce y escucha novelas web."}
        </p>
      </header>

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <GearIcon /> Ajustes
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Gemini API Key</label>
                          <input 
                              type="password"
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              placeholder="AIza..."
                              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                              Si la variable de entorno falla en Vercel, pega tu clave aquí. Se guardará localmente en tu navegador.
                          </p>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                          <button 
                              onClick={() => setShowSettings(false)}
                              className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={saveSettings}
                              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                          >
                              Guardar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW: READER (Has Story) */}
      {currentStory && (
        <div className="w-full animate-fade-in-up">
          <div className="mb-4">
             <button 
               onClick={handleBackToChapters}
               className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
             >
               <BackIcon />
               <span>
                 {bookDetails ? `Volver a la Lista de Capítulos` : 'Volver al Inicio'}
               </span>
             </button>
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden relative">
            <div className="sticky top-0 z-10 bg-gray-800/95 backdrop-blur border-b border-gray-700 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-bold text-white truncate max-w-md">
                {currentStory.title}
              </h2>

              <div className="flex items-center space-x-2">
                {/* Toggle Original Text */}
                {currentStory.originalText && (
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Ver texto original detectado"
                  >
                    <GlobeIcon />
                    <span className="hidden sm:inline">{showOriginal ? "Ver Traducción" : "Ver Original (Inglés)"}</span>
                  </button>
                )}

                <button
                  onClick={handleTogglePlay}
                  disabled={state === ProcessingState.GENERATING_AUDIO}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-full font-medium transition-all transform hover:scale-105 ${
                    state === ProcessingState.PLAYING 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
                  }`}
                >
                  {state === ProcessingState.GENERATING_AUDIO ? (
                    <Spinner />
                  ) : state === ProcessingState.PLAYING ? (
                    <>
                      <PauseIcon />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      {state === ProcessingState.PAUSED ? <PlayIcon /> : <HeadphoneIcon />}
                      <span>{state === ProcessingState.PAUSED ? 'Reanudar' : 'Escuchar (IA)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-8 md:p-12 bg-gray-900/50">
               {showOriginal && currentStory.originalText ? (
                 <div className="p-4 bg-black/30 rounded-lg border border-gray-600 mb-6">
                   <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                     Texto Original Detectado (Inicio y Final)
                   </h3>
                   <p className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                     {currentStory.originalText}
                   </p>
                   <p className="mt-2 text-xs text-blue-400 italic">
                     * Verifica si la sección "END" corresponde al final lógico del capítulo.
                   </p>
                 </div>
               ) : null}

               <article className="prose prose-invert prose-lg max-w-none font-serif leading-relaxed text-gray-300">
                {currentStory.translatedText.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-6">
                    {paragraph}
                  </p>
                ))}
              </article>
              <div className="mt-12 pt-8 border-t border-gray-700 text-center text-gray-500 text-sm">
                Traducción completa generada por Gemini AI.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CHAPTER LIST (Has Book Details, No Story) */}
      {!currentStory && bookDetails && (
        <div className="w-full animate-fade-in-up">
           <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 border-b border-gray-700 pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{bookDetails.title}</h2>
                  {bookDetails.description && <p className="text-gray-400 max-w-2xl">{bookDetails.description}</p>}
                  {bookDetails.totalChaptersFound && (
                    <span className="inline-block mt-2 bg-blue-900/40 text-blue-300 text-xs px-2 py-1 rounded">
                      {bookDetails.totalChaptersFound} Capítulos Detectados
                    </span>
                  )}
                </div>
                <button 
                  onClick={clearSavedData}
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <TrashIcon />
                  <span>Borrar Libro y Salir</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {bookDetails.chapters.map((chapter, index) => (
                  <button
                    key={index}
                    onClick={() => handleProcessChapter(chapter.url, chapter.title)}
                    className="flex flex-col items-center justify-center p-3 bg-gray-900/50 hover:bg-blue-900/30 border border-gray-700 hover:border-blue-500 rounded-lg transition-all text-center group h-20"
                  >
                    <span className="text-xs font-bold text-gray-500 group-hover:text-blue-300 mb-1">
                      CAP
                    </span>
                    <span className="text-lg text-white font-bold group-hover:scale-110 transition-transform">
                      {chapter.number || index + 1}
                    </span>
                  </button>
                ))}
              </div>
              
              {bookDetails.chapters.length === 0 && (
                <p className="text-center text-gray-500 py-10">No se encontraron capítulos. Intenta ingresando la URL de un capítulo específico.</p>
              )}
           </div>
        </div>
      )}

      {/* VIEW: INPUT (No Story, No Book Details) */}
      {!currentStory && !bookDetails && (
        <div className="w-full bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700 mb-8 animate-fade-in">
          <div className="flex space-x-4 mb-4 border-b border-gray-700 pb-4">
            <button
              onClick={() => setInputMode('url')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'url' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <LinkIcon />
              <span>URL Novela / Capítulo</span>
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                inputMode === 'text' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <TextIcon />
              <span>Pegar Texto</span>
            </button>
          </div>

          <div className="space-y-4">
            {inputMode === 'url' ? (
              <div className="relative">
                <input
                  type="url"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="https://novellive.app/book/..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button 
                  onClick={handleUseExample}
                  className="absolute right-3 top-3 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Ejemplo
                </button>
              </div>
            ) : (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pega el contenido del capítulo aquí..."
                className="w-full h-40 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-sm resize-y"
              />
            )}

            <div className="flex justify-end space-x-3">
              {inputMode === 'url' && (
                <button
                  onClick={handleAnalyzeBook}
                  disabled={state !== ProcessingState.IDLE || !inputText}
                  className={`px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg transition-all ${
                     !inputText ? 'bg-gray-700 text-gray-500' : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                   {state === ProcessingState.ANALYZING_BOOK ? <Spinner /> : <span>Analizar Novela (Portada)</span>}
                </button>
              )}
              
              <button
                onClick={inputMode === 'url' ? () => handleProcessChapter(inputText) : handleProcessText}
                disabled={state !== ProcessingState.IDLE || !inputText}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg transform transition active:scale-95 ${
                  !inputText 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                }`}
              >
                {(state === ProcessingState.EXTRACTING || state === ProcessingState.TRANSLATING) ? (
                  <>
                    <Spinner />
                    <span>Analizando y Extrayendo (Modo Pro)...</span>
                  </>
                ) : (
                  <>
                    <span>{inputMode === 'url' ? 'Leer Capítulo Directo' : 'Leer Texto'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-800 text-red-200 rounded-lg text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default App;
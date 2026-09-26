import { useState, useRef, useEffect } from 'react';
import { feedback } from '../utils/feedback';

interface VoiceExpenseResultItem {
  amount: number;
  merchant: string;
  category: string;
  type?: 'expense' | 'income';
}

interface UseVoiceExpenseOptions {
  isEn?: boolean;
  onSuccess?: (result: { items: VoiceExpenseResultItem[]; transcript?: string }) => void;
  onTextUpdate?: (text: string) => void;
}

export function useVoiceExpense({ isEn = false, onSuccess, onTextUpdate }: UseVoiceExpenseOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioTranscribing, setIsAudioTranscribing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    setError(null);
    setStatusText(isEn ? 'Listening... Speak now' : 'Lyssnar... Prata in köpet');
    audioChunksRef.current = [];
    let startedAny = false;

    // WebSpeech API for live transcription
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = isEn ? 'en-US' : 'sv-SE';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim() && onTextUpdate) {
            onTextUpdate(currentText);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
        startedAny = true;
      } catch (err) {
        console.warn('SpeechRecognition init error:', err);
      }
    }

    // MediaRecorder for Gemini Multimodal Audio AI
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const supportedMime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : MediaRecorder.isTypeSupported('audio/ogg')
            ? 'audio/ogg'
            : 'audio/wav';

      mimeTypeRef.current = supportedMime;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMime });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      startedAny = true;
      feedback.tap();
    } catch (err: any) {
      console.warn('MediaRecorder error:', err);
      if (!startedAny) {
        setStatusText(null);
        setError(
          isEn
            ? 'Microphone access denied or not supported.'
            : 'Kunde inte starta mikrofonen. Tillåt mikrofonen i din webbläsare.'
        );
      } else {
        setIsRecording(true);
        feedback.tap();
      }
    }
  };

  const stopRecordingAndProcess = async (currentInputText: string) => {
    feedback.tap();
    setIsRecording(false);
    setStatusText(isEn ? 'Analyzing voice with AI...' : 'Analyserar röst med AI...');
    setIsAudioTranscribing(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    let audioBlob: Blob | null = null;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
      }
    }

    stopMediaTracks();

    if (audioBlob && audioBlob.size > 500) {
      try {
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob!);
        });

        const res = await fetch('/api/parse-audio-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: mimeTypeRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setIsAudioTranscribing(false);
          setStatusText(null);

          const itemsToProcess: VoiceExpenseResultItem[] = [];
          if (Array.isArray(data.items) && data.items.length > 0) {
            for (const item of data.items) {
              if (item.amount > 0) {
                itemsToProcess.push({
                  amount: item.amount,
                  merchant: item.name || 'Röstinlägg',
                  category: item.category || (isEn ? 'Uncategorized' : 'Okategoriserat'),
                  type: item.type,
                });
              }
            }
          } else if (data && data.amount > 0) {
            itemsToProcess.push({
              amount: data.amount,
              merchant: data.name || 'Röstinlägg',
              category: data.category || (isEn ? 'Uncategorized' : 'Okategoriserat'),
              type: data.type,
            });
          }

          if (itemsToProcess.length > 0) {
            if (onSuccess) {
              onSuccess({
                items: itemsToProcess,
                transcript: data.transcript,
              });
            }
            return { handled: true, data };
          } else if (data && data.transcript && onTextUpdate) {
            onTextUpdate(data.transcript);
          }
        }
      } catch (err) {
        console.warn('Backend audio AI processing failed:', err);
      }
    }

    setIsAudioTranscribing(false);
    setStatusText(null);
    return { handled: false, text: currentInputText };
  };

  const toggleRecording = (currentInputText: string) => {
    if (isRecording) {
      return stopRecordingAndProcess(currentInputText);
    } else {
      startRecording();
      return Promise.resolve(null);
    }
  };

  return {
    isRecording,
    isAudioTranscribing,
    statusText,
    error,
    setError,
    toggleRecording,
    startRecording,
    stopRecordingAndProcess,
  };
}

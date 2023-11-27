import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import axios from "axios";
import { useSpeechConfig } from "../modules/token_util";
import { AudioConfig, SpeechRecognizer } from "microsoft-cognitiveservices-speech-sdk";



export const useRecognizer = (speechConfig) => {
  
    //using latest speechConfig (token and region)
    // const { speechConfig } = useSpeechConfig();
  
  
  
    //indicator for whether speech recognition is listening
    const [listening, setListening] = useState(false);
  
    //reference to speech recognizer
    const audioRef = useRef(null);
    const speechRecognizerRef = useRef(null);

    const speakHandler = useCallback(() => {
      //toggle b/w start and stop speech recognition
  
      if (!listening) {

        audioRef.current = AudioConfig.fromDefaultMicrophoneInput();
        speechRecognizerRef.current = new SpeechRecognizer(speechConfig, audioRef.current);

        speechRecognizerRef.current.startContinuousRecognitionAsync();
        setListening(true);
      } else {
        speechRecognizerRef.current.stopContinuousRecognitionAsync();
        setListening(false);
      }
    }, [listening, speechRecognizerRef.current, audioRef.current, speechConfig]);
  
    return { listening, speakHandler, speechRecognizerRef, setListening };
  };
  


export  function useMicrophone() {
    const [audioContext, setAudioContext] = useState(null);
    const [audioLevel, setAudioLevel] = useState(0);
  
    const startAudioContext = () => {
      const context = new AudioContext();
      setAudioContext(context);
    };
  
    useEffect(() => {
      if (!audioContext) return;
  
      let animationFrameId = null;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
  
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
  
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
  
          const updateAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
  
            // Compute the average audio level
            const level = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            setAudioLevel(level);
  
            animationFrameId = requestAnimationFrame(updateAudioLevel);
          };
  
          updateAudioLevel();
        });
  
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }, [audioContext]);
  
    return { audioLevel, startAudioContext };
  }
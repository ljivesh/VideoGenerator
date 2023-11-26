import { useState } from "react";
import axios from "axios";
import {
  SpeechConfig,
  AudioConfig,
  SpeechRecognizer,
  ResultReason
} from "microsoft-cognitiveservices-speech-sdk";

const Assistant = () => {
  const [text, setText] = useState("");

  const [speechRecognizer, setRecognizer] = useState(null);

  const [isListening, setIsListening] = useState(false);

  const startContinousTranscription = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/get-speech-token`
      );
      const token = response.data.token;
      const speechRegion = response.data.region;

      const speechConfig = SpeechConfig.fromAuthorizationToken(
        token,
        speechRegion
      );
      speechConfig.speechRecognitionLanguage = "en-US";
      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();

      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

      setRecognizer((rec) => {
        rec = recognizer;
        return rec;
      });

      // handle results
      recognizer.recognized = (_s, event) => {
        if (event.result.reason === ResultReason.RecognizedSpeech) {
            setText(event.result.text);
        }
      };
      recognizer.canceled = () => {
        setText("Cancelled");
        updateRecognizer((reco) => {
            if(reco) {
                reco.stopContinuousRecognitionAsync(() => {
                    reco.close();
                });
                setIsListening(false);
            }
          return null;
        });
      };

      setIsListening(true);
      recognizer.startContinuousRecognitionAsync();
    } catch (err) {
      console.error(err);
    }
  };

  const stopContinousTranscription = () => {
    setRecognizer((reco) => {
      if (reco) {
        setIsListening(false);
        reco.stopContinuousRecognitionAsync(() => {
          reco.close();
        });
      }
      return null;
    });
  };

  return (
    <div>
      <h1>Assistant</h1>
      <div>
        <button onClick={startContinousTranscription} disabled={isListening}>
          Start
        </button>
        <button onClick={stopContinousTranscription} disabled={!isListening}>
          Stop
        </button>
      </div>
        <div>
            <p>{text}</p>
        </div>
    </div>
  );
};

export default Assistant;

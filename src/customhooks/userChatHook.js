import axios from "axios";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSpeechConfig } from "../modules/token_util";
import {
  AudioConfig,
  ResultReason,
  SpeechRecognizer,
  SpeechSynthesizer,
  Connection,
  SpeakerAudioDestination,
} from "microsoft-cognitiveservices-speech-sdk";


export const useConversation = () => {
  //user and bot conversation array of objects {role: "user" or "bot", content: "user response" or "bot response"}
  const [conversation, setConversation] = useState([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(-1);


  //push user response to conversation array
  const pushUserConversation = (userResponse) => {
    setConversation([...conversation, { role: "user", content: userResponse }]);
  };

  const pushBotConversation = (botResponse) => {
    setConversation([
      ...conversation,
      { role: "assistant", content: botResponse },
    ]);
  };

  const disableModel = async () => { 
    await axios.post('/api/speech/disable-model');
    setConversation(prev=> {
      console.log(prev.slice(0, currentUserIndex));
      return prev.slice(0, currentUserIndex)});
    // console.log(response.data);
  };

  const enableModel = async () => {
    await axios.post('/api/speech/enable-model');
  };

  

  //send conversation to server
  useEffect(() => {
    const sendConversation = async () => {
      const response = await axios.post("/api/speech/post-conversation", {
        conversation: conversation,
      });
      console.log(`Final response: ${response.data}`);
    };

    //if last object in conversation array is user response, send conversation to server
    if (conversation.slice(-1)[0]?.role === "user") {
      console.log(conversation);
      sendConversation();
      setCurrentUserIndex(conversation.length - 1);
    }
  }, [conversation]);

  //fetch conversation from server
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const res = await axios.get("/api/speech/fetch-conversation");
        // console.log("fetching changes"+JSON.stringify(res.data));
        // if (res.data.length > 0 && res.data[res.data.length - 1].role === "assistant") {
        // //   console.log(res.data[res.data.length - 1]);
        //   setConversation(res.data);
        // }

        if (
          res.data.length > 0 &&
          JSON.stringify(res.data) !== JSON.stringify(conversation)
        ) {
          console.log("Changed!!");

          if (res.data[res.data.length - 1].role === "assistant")
            setConversation(res.data);
        }
      } catch (error) {
        console.log(error);
      }
    }, 250);

    return () => clearInterval(intervalId); // This represents the unmount function, in which you need to clear your interval to prevent memory leaks.
  }, [conversation, setConversation]);

  return {
    conversation,
    currentUserIndex,
    pushUserConversation,
    setConversation,
    disableModel,
    enableModel,
  };
};


export const usePlayer = ()=> {
 

 const [player, setPlayer] = useState(new SpeakerAudioDestination());

  useEffect(()=> {
    if(player.isClosed) {
      console.log("Player closed")
      setPlayer(new SpeakerAudioDestination());
    }
  }, [player]);

  return {player};
};

export const useSynthesize = ({conversation, player}) => {
  const { speechConfig } = useSpeechConfig();

  // const { conversation } = useConversation();

  // const {player} = usePlayer();
7
  const audioConfig = useMemo(() => {
    if (player) return AudioConfig.fromSpeakerOutput(player);
  }, [player]);

  const synthesizer = useMemo(() => {
    if (speechConfig && audioConfig)
      return new SpeechSynthesizer(speechConfig, audioConfig);
  }, [speechConfig, audioConfig]);

  const stopSpeech = useCallback(() => {
    if (player) {
      player.mute();
    }
  }, [player]);

  //synthesize speech
  useEffect(() => {
    if (conversation.length > 0) {
      console.log("Triggered");
      synthesizer.speakTextAsync(conversation[conversation.length - 1].content);
      player.unmute();
    }
  }, [conversation, synthesizer]);

  return { stopSpeech };
};


export const useTranscribe = () => {
  const { pushUserConversation, disableModel, enableModel } = useConversation();

  //using latest speechConfig (token and region)
  const { speechConfig } = useSpeechConfig();

  // const {stopSpeech} = useSynthesize();
  // const {player} = usePlayer();

  const [player, setPlayer] = useState(new SpeakerAudioDestination());
  useEffect(()=> {
    if(player.isClosed) {
      console.log("Player closed")
      setPlayer(new SpeakerAudioDestination());
    }
  }, [player]);


  //indicator for whether speech recognition is listening
  const [listening, setListening] = useState(false);

  //reference to speech recognizer
  const recognizerRef = useRef(null);

  //start speech recognition setvice
  const startSpeechRecognition = useCallback(() => {
    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
    recognizerRef.current = new SpeechRecognizer(speechConfig, audioConfig);



    //speech recognized event
    recognizerRef.current.recognized = async (s, e) => {
      
      if (e.result.reason === ResultReason.RecognizedSpeech) {

        player.mute();
        player.close();
        // resetPlayer();

        await disableModel();
        await enableModel();
        
        console.log(`Transcibed: ${e.result.text}`);

        pushUserConversation(e.result.text);
      } else if (e.result.reason === ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
      }
    };

    //speech recognition canceled event
    recognizerRef.current.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason}`);
      if (e.reason === CancellationReason.Error) {
        console.log(`CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log("CANCELED: Did you update the subscription info?");
      }
      setListening(false);
      recognizerRef.current.stopContinuousRecognitionAsync();
    };

    //session stopped event
    recognizerRef.current.sessionStopped = (s, e) => {
      console.log("\n    Session stopped event.");
      setListening(false);
      recognizerRef.current.stopContinuousRecognitionAsync();
    };

    //start speech recognition
    recognizerRef.current.startContinuousRecognitionAsync();
  }, [speechConfig, recognizerRef, pushUserConversation]);

  const speakHandler = useCallback(() => {
    //toggle b/w start and stop speech recognition

    if (!listening) {
      startSpeechRecognition();
      setListening(true);
    } else {
      recognizerRef.current.stopContinuousRecognitionAsync();
      setListening(false);
    }
  }, [listening, startSpeechRecognition, recognizerRef]);

  return { listening, speakHandler, player };
};

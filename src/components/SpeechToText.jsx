import { useState, useEffect } from "react";
import { useAuth } from "../providers/Auth";
import { useConversation } from "../customhooks/conversation-hook";
import { useRecognizer } from "../customhooks/recognizer-hook";
import { useSynthesize } from "../customhooks/synthesizer-hook";
import { useQueue } from "@uidotdev/usehooks";
import {
  ResultReason,
  CancellationReason,
} from "microsoft-cognitiveservices-speech-sdk";
import { SOCKETURL } from "../modules/envirnoment";
import { useSpeechConfig } from "../modules/token_util";
import {io} from 'socket.io-client';

const socket = io(SOCKETURL, {path: '/socket'});

function SpeechToText() {
  const { user, logout } = useAuth();

  const {
    queue,
    first,
    add: addToQueue,
    remove: removeFromQueue,
    clear: clearQueue,
    size: queueSize,
  } = useQueue([]);

  const { conversation, disableModel, enableModel, addToConversation } =
    useConversation();

    const {speechConfig} = useSpeechConfig();

  const { speechRecognizerRef, listening, setListening, speakHandler } =
    useRecognizer(speechConfig);


  const { speechSynthesizer, player, stopPlayer } = useSynthesize(speechConfig);

  const [stopFlag, setStopFlag] = useState(false);

  const enQueue = ()=> {
    addToQueue("You added a very big string in the queue, I am currently speaking this string");
  }


  useEffect(() => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.recognized = (s, e) => {
        if (e.result.reason === ResultReason.RecognizedSpeech) {
          
          setStopFlag(true);

          console.log(e.result.text);
          addToConversation(e.result.text, "user");
        }
      };

      //speech recognition canceled event
      speechRecognizerRef.current.canceled = (s, e) => {
        console.log(`CANCELED: Reason=${e.reason}`);
        if (e.reason === CancellationReason.Error) {
          console.log(`CANCELED: ErrorCode=${e.errorCode}`);
          console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
          console.log("CANCELED: Did you update the subscription info?");
        }
        setListening(false);
        speechRecognizerRef.current.stopContinuousRecognitionAsync();
      };

      //session stopped event
      speechRecognizerRef.current.sessionStopped = (s, e) => {
        console.log("\n    Session stopped event.");
        setListening(false);
        speechRecognizerRef.current.stopContinuousRecognitionAsync();
      };
    }

    return () => {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.recognized = null;
        speechRecognizerRef.current.canceled = null;
        speechRecognizerRef.current.sessionStopped = null;
      }
    };
  }, [
    speechRecognizerRef.current,
    setListening,
    disableModel,
    enableModel,
    addToConversation,
  ]);

  useEffect(() => {
    if (queueSize > 0 && !stopFlag && speechSynthesizer) {
      console.log(queue);
      player.unmute();
      speechSynthesizer.speakTextAsync(first);
      addToConversation(first, "assistant");
      removeFromQueue();
    }
  }, [
    queueSize,
    removeFromQueue,
    speechSynthesizer,
    addToConversation,
    stopFlag,
    player,
    first
  ]);

  useEffect(() => {
    if (stopFlag) {
      
      // player.mute();
      stopPlayer();
      // disableModel();
      // enableModel();
      clearQueue();
      setStopFlag(false);
    }
  }, [stopFlag, player, clearQueue, disableModel, enableModel]);


  useEffect(()=> {
    socket.on('connect', ()=> {
        console.log('connected to server');
    });

    socket.on('disconnect', ()=> {
        console.log('disconnected from server');
    });

    socket.on('enqueue', (content)=> {
        addToQueue(content);
    });

    return ()=> {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('message');
    }

}, []);

useEffect(()=> {

  const lastEntry = conversation[conversation.length - 1];
  if(lastEntry && lastEntry.role === 'user') {
      socket.emit('user-query', conversation);
  }

}, [conversation]);

  return (
    <>
      <h1>{!listening ? "Quite..." : "Listening..."}</h1>
      <h2>Logged in as: {user.email}</h2>
      <div>
        <button onClick={speakHandler}>
          {!listening ? "Start Speaking" : "Stop Speaking"}
        </button>
        {/* <button onClick={clearResult} >Clear</button> */}
      </div>
      {conversation.map((chat, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1px solid gray",
            padding: 10,
            margin: 10,
            borderRadius: 10,
          }}
        >
          <h3>{chat.role}</h3>
          <p style={{ textAlign: "left" }}>{chat.content}</p>
        </div>
      ))}
      <button onClick={logout}>Logout</button>
      <button onClick={enQueue}>Enqueue</button>
    </>
  );
}

export default SpeechToText;

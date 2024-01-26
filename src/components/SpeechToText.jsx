import { useState, useEffect, useRef, useMemo } from "react";
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
import { io } from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { Model as Avatar } from "./Avatar";
import { Environment, OrbitControls } from "@react-three/drei";
import {GREETING, AGENT_ID} from '../modules/envirnoment.js';

const agentId = AGENT_ID;
const socket = io(SOCKETURL, { path: "/socket", query:{agentId}  });

const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="en-US-JasonNeural"  >
<mstts:viseme type="FacialExpression"/>

__TEXT__
</voice>
</speak>`;
const greetingMessage = GREETING || 'Hello!, I am a virtual assistant, I am here to assist you.';


function SpeechToText({ greeted, handleGreeted }) {
  const { user, logout } = useAuth();
  const { speechConfig } = useSpeechConfig();

  const [currentAnimation, setCurrentAnimation] = useState("idle");

  const convoID = useRef(0);

  const playerStartRef = useRef(0);
  const playerWaitRef = useRef(0);

  const {
    queue,
    first,
    add: addToQueue,
    remove: removeFromQueue,
    clear: clearQueue,
    size: queueSize,
  } = useQueue([]);

  const {
    queue: frameQueue,
    add: addFrame,
    remove: removeFrame,
    first: firstFrame,
    clear: clearFrameQueue,
  } = useQueue();

  const {
    queue: wordQueue,
    add: addWord,
    remove: removeWord,
    first: firstWord,
    clear: clearWordQueue,
  } = useQueue([]);

  const greet = () => {
    if (!greeted) {
      addToQueue(greetingMessage);
    }
  };

  const { conversation, disableModel, enableModel, addToConversation } =
    useConversation();

  const { speechRecognizerRef, listening, setListening, speakHandler } =
    useRecognizer(speechConfig);

  const { speechSynthesizer, player, stopPlayer } = useSynthesize(speechConfig);

  const [stopFlag, setStopFlag] = useState(false);

  const enQueue = () => {
    addToQueue(
      "You added a very big string in the queue, I am currently speaking this string"
    );
  };

  const consumeWords = (currentTime) => {
    if (!firstWord) {
      // console.log("Word queue empty");
      return;
    }
    // console.log(firstWord);
    // console.log(currentTime, firstWord.audioOffset/10000, currentTime > firstWord.audioOffset/10000);
    if (currentTime > firstWord.audioOffset / 10000) {
      // console.log(firstWord.text);
      addToConversation(firstWord.text, "assistant");
      removeWord();
      // consumeWords(currentTime);
    }
  };

  useEffect(() => {
    const logTime = (e) => {
      if (playerStartRef.current > playerWaitRef.current) {
        // console.log(e.timeStamp - playerStartRef.current);
        consumeWords(e.timeStamp - playerStartRef.current);
      }
    };

    const logPlay = (e) => {
      !greeted ? setCurrentAnimation("wave") : setCurrentAnimation("idle");

      if (!greeted) handleGreeted();

      console.log(`Playback started at: ${e.timeStamp}`);
      playerStartRef.current = e.timeStamp;
    };

    const logEnd = (e) => {
      // console.log(`Playback ended at: ${e.timeStamp}`);
    };

    const logWaiting = (e) => {
      setCurrentAnimation("idle");

      console.log(`Playback waiting for new data: ${e.timeStamp}`);
      playerWaitRef.current = e.timeStamp;
    //   console.log(wordQueue.map((word) => word.audioOffset / 10000));
    };

    player.internalAudio?.addEventListener("timeupdate", logTime);
    player.internalAudio?.addEventListener("playing", logPlay);
    player.internalAudio?.addEventListener("waiting", logWaiting);
    // player.internalAudio?.addEventListener("ended", logEnd);

    return () => {
      player.internalAudio.removeEventListener("timeupdate", logTime);
      player.internalAudio?.removeEventListener("playing", logPlay);
      player.internalAudio?.removeEventListener("waiting", logWaiting);
      // player.internalAudio?.removeEventListener("ended", logEnd);
    };
  }, [player, wordQueue, firstWord]);

  useEffect(() => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.recognized = (s, e) => {
        if (e.result.reason === ResultReason.RecognizedSpeech) {
          //   setStopFlag(true);
          convoID.current = convoID.current + 1;
          console.log(e.result.text);
          addToConversation(e.result.text, "user");
        }
      };

      speechRecognizerRef.current.recognizing = (s, e) => {
        console.log("Recognizing your input");
        setCurrentAnimation("noddiing");
        setStopFlag(true);
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
    if (speechSynthesizer) {
      speechSynthesizer.visemeReceived = (s, e) => {
        const frames = JSON.parse(e.animation).BlendShapes;
        // console.log(`Viseme received:`, JSON.parse(e.animation).BlendShapes);
        frames.forEach((frame) => addFrame(frame));
      };
      speechSynthesizer.wordBoundary = (s, e) => {
        // console.log(e);
        // addToConversation(e.text, "assistant");
        addWord(e);
      };
    }
  }, [speechSynthesizer]);

  useEffect(() => {
    if (queueSize > 0 && !stopFlag) {
      console.log(queue);
      player.unmute();

      // speechSynthesizer.speakTextAsync(first);
      speechSynthesizer.speakSsmlAsync(
        ssml.replace("__TEXT__", first),
        (result) => {
        //   console.log(result);
        }
      );

      //   addToConversation(first, "assistant");
      removeFromQueue();
    }
  }, [
    queueSize,
    removeFromQueue,
    speechSynthesizer,
    addToConversation,
    stopFlag,
    player,
    first,
  ]);

  useEffect(() => {
    if (stopFlag) {
      // player.mute();
      stopPlayer();
      // disableModel();
      // enableModel();
      clearQueue();
      clearFrameQueue();
      setStopFlag(false);
    }
  }, [
    stopFlag,
    player,
    clearQueue,
    disableModel,
    enableModel,
    clearFrameQueue,
  ]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("connected to server");
    });

    socket.on("disconnect", () => {
      console.log("disconnected from server");
    });

    socket.on("enqueue", (data) => {
      if (!stopFlag && data.id === convoID.current) {
        console.log(data);
        addToQueue(data.content);
      } else {
        console.log("Garbage", data);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message");
    };
  }, []);

  useEffect(() => {
    const lastEntry = conversation[conversation.length - 1];
    if (lastEntry && lastEntry.role === "user") {
      socket.emit("user-query", {
        conversation: conversation,
        convoId: convoID.current,
      });
    }
  }, [conversation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        listening && speakHandler();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [listening]);

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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "60vw",
            height: "60vh",
            margin: 20,
            border: "2px solid gray",
          }}
        >
          <Canvas
            camera={{
              position: [0, 0, 8],
              fov: 11,
            }}
          >
            <color attach="background" args={["#ececec"]} />
            <Avatar
              position={[0, -2.9, 0]}
              scale={1.9}
              lipsync={{ frameQueue, removeFrame, firstFrame }}
              currentAnimation={currentAnimation}
              greet={greet}
            />
            <Environment preset="sunset" />
            <OrbitControls />
          </Canvas>
        </div>
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

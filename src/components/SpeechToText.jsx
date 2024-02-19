import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../providers/Auth";
import { useSynthesize } from "../customhooks/synthesizer-hook";
import { useQueue } from "@uidotdev/usehooks";
import { SOCKETURL } from "../modules/envirnoment";
import { useSpeechConfig } from "../modules/token_util";
import { io } from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { Model as Avatar } from "./Avatar";
import { Environment, OrbitControls } from "@react-three/drei";
import { GREETING, AGENT_ID } from "../modules/envirnoment.js";
import { voiceMappings } from "../mappings.js";
import { useLoadFfmpeg } from "../customhooks/ffmpeg-hook.js";
import { fetchFile } from "@ffmpeg/ffmpeg";


const agentId = AGENT_ID;
const socket = io(SOCKETURL, { path: "/socket", query: { agentId } });

const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
<voice name="__VOICE__"  >
<mstts:viseme type="FacialExpression"/>

__TEXT__
</voice>
</speak>`;
const greetingMessage =
  GREETING || "Hello!, I am a virtual assistant, I am here to assist you.";

function SpeechToText({ greeted, handleGreeted }) {

  const {ready, ffmpeg} = useLoadFfmpeg();
  
  const { user, logout } = useAuth();
  const { speechConfig } = useSpeechConfig();

  const [voice, setVoice] = useState("hi-IN-MadhurNeural");

  const [userInput, setUserInput] = useState("");

  const [currentAnimation, setCurrentAnimation] = useState("idle");



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

  const bufferFrameQueue = useRef([]);

  const greet = () => {
    if (!greeted) {
      addToQueue(greetingMessage);
    }
  };



  const { speechSynthesizer } = useSynthesize(speechConfig);
  const audioDurationRef = useRef();

  // const [stopFlag, setStopFlag] = useState(false);

  const enQueue = () => {
    if (userInput.length !== 0) {
      addToQueue(userInput);
      setUserInput("");
    }
  };



  useEffect(() => {
    if (speechSynthesizer) {
      speechSynthesizer.visemeReceived = (s, e) => {
        const frames = JSON.parse(e.animation).BlendShapes;
        // console.log(`Viseme received:`, JSON.parse(e.animation).BlendShapes);
        frames.forEach((frame)=> bufferFrameQueue.current.push(frame));
        frames.forEach((frame) => addFrame(frame));
      };
      speechSynthesizer.wordBoundary = (s, e) => {
        // console.log(e);
        // addToConversation(e.text, "assistant");
        // addWord(e);
      };
    }
  }, [speechSynthesizer]);

  useEffect(() => {
    // console.log(speechSynthesizer);
    if (speechSynthesizer) {
      if (queueSize > 0) {
        console.log(queue);
        // player.unmute();

        // speechSynthesizer.speakTextAsync(first);
        speechSynthesizer.speakSsmlAsync(
          ssml.replace("__TEXT__", first).replace("__VOICE__", voice),
          (result) => {
              // console.log(result.audioData);
              try {
                console.log(result);
                const blob = new Blob([result.audioData], {type: 'audio/mp3'});
                console.log(blob);

                audioDurationRef.current = result.audioDuration;
                // const audioBlobUrl = window.URL.createObjectURL(blob);
                // audioStreamRef.current = new MediaStream([new Audio(audioBlobUrl).captureStream()]);
                audioRef.current.src = window.URL.createObjectURL(blob); // srcObject or src check
                recordedAudioBlobsRef.current = blob;
                
                console.log(bufferFrameQueue.current)
                bufferFrameQueue.current.forEach((frame)=> addFrame(frame));


              } catch(error) {
                console.error(error);
              }


          }
        );

        //   addToConversation(first, "assistant");
        removeFromQueue();
      }
    }
  }, [
    queueSize,
    removeFromQueue,
    speechSynthesizer,
    first,
  ]);

 


  const canvasRef = useRef();
  const videoRef = useRef();
  const audioRef = useRef();
  const audioStreamRef = useRef();

  const mediaSourceRef = useRef();
  const mediaRecorderRef = useRef();
  const recordedBlobsRef = useRef();
  const recordedAudioBlobsRef = useRef();
  const sourceBufferRef = useRef();
  const streamRef = useRef();

  const recordButtonRef = useRef();
  const playButtonRef = useRef();
  const downloadButtonRef = useRef();


  function handleSourceOpen(event) {
    console.log('MediaSource opened');
    sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer('video/mp4');
    console.log('Source buffer: ', sourceBufferRef.current);
  }
  
  function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
      recordedBlobsRef.current.push(event.data);
    }

    if (audioStreamRef.current && audioStreamRef.current.active) {
      const reader = new FileReader();
      reader.onloadend = () => {
        recordedBlobsRef.current.push(reader.result);
      };
      reader.readAsArrayBuffer(event.data);
    }
  }
  
  function handleStop(event) {
    console.log('Recorder stopped: ', event);
    const superBuffer = new Blob(recordedBlobsRef.current, {type: 'video/mp4'});
    // videoRef.current.src = window.URL.createObjectURL(superBuffer); // srcObject or src check
    combine();
  }

  function toggleRecording() {
    if (recordButtonRef.current.textContent === 'Start Recording') {
      startRecording();
    } else {
      stopRecording();
      recordButtonRef.current.textContent = 'Start Recording';
      playButtonRef.current.disabled = false;
      downloadButtonRef.current.disabled = false;
    }
  }

  function startRecording() {
    let options = {mimeType: 'video/webm'};
    recordedBlobsRef.current = [];
    // const combinedMediaStream = new MediaStream();
    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    } catch (e0) {
      console.log('Unable to create MediaRecorder with options Object: ', e0);
      try {
        options = {mimeType: 'video/webm,codecs=vp9'};
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      } catch (e1) {
        console.log('Unable to create MediaRecorder with options Object: ', e1);
        try {
          options = 'video/vp8'; // Chrome 47
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
        } catch (e2) {
          alert('MediaRecorder is not supported by this browser.\n\n' +
            'Try Firefox 29 or later, or Chrome 47 or later, ' +
            'with Enable experimental Web Platform features enabled from chrome://flags.');
          console.error('Exception while creating MediaRecorder:', e2);
          return;
        }
      }
    }
    console.log('Created MediaRecorder', mediaRecorderRef.current, 'with options', options);
    recordButtonRef.current.textContent = 'Stop Recording';
    playButtonRef.current.disabled = true;
    downloadButtonRef.current.disabled = true;
    mediaRecorderRef.current.onstop = handleStop;
    mediaRecorderRef.current.ondataavailable = handleDataAvailable;
    mediaRecorderRef.current.start(100); // collect 100ms of data
    console.log('MediaRecorder started', mediaRecorderRef.current);
  }
  
  function stopRecording() {
    mediaRecorderRef.current.stop();
    console.log('Recorded Blobs: ', recordedBlobsRef.current);
    videoRef.current.controls = true;
  }
  
  function play() {
    videoRef.current.play();
  }
  
  function download() {
    const blob = new Blob(recordedBlobsRef.current, {type: 'video/mp4'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.mp4';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  async function combine() {
    const videoBlob = new Blob(recordedBlobsRef.current, {type: 'video/mp4'});
    // const audioBlob = new Blob(recordedAudioBlobsRef.current, {type: 'audio/mp3'});
    const audioBlob = recordedAudioBlobsRef.current;
    // const url = window.URL.createObjectURL(blob);
    
    ffmpeg.FS('writeFile', 'audio.mp3', await fetchFile(audioBlob));
    ffmpeg.FS('writeFile', 'video.mp4', await fetchFile(videoBlob));

    await ffmpeg.run('-i', 'video.mp4', '-i', 'audio.mp3', '-c', 'copy', 'output.mkv');

    const data = ffmpeg.FS('readFile', 'output.mkv');

    videoRef.current.src = window.URL.createObjectURL(new Blob([data.buffer], {type: 'video/mkv'})); // srcObject or src check


    // await ffmpeg.FS('writeFile', 'temp.webm', await fetchFile(new Blob(recordedBlobsRef.current, {type: 'video/mp4'})));

  }

  useEffect(()=> {
    
    mediaSourceRef.current = new MediaSource();
    mediaSourceRef.current.addEventListener('sourceopen', handleSourceOpen, false);

    streamRef.current = canvasRef.current.captureStream();
    console.log('Started stream capture from canvas element: ', streamRef.current);


    recordButtonRef.current.onclick = toggleRecording;
    playButtonRef.current.onclick = play;
    downloadButtonRef.current.onclick = download;


    // videoRef.current.srcObject = stream;
  }, [])

  return (
    <>
      {ready ? <h2>Ffmpeg ready</h2> : <h2>Ffmpeg not ready</h2>}
      <h2>Logged in as: {user.email}</h2>
  
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          paddingTop: "10px",
        }}
      >
        <label>Select the language</label>
        <select value={voice} onChange={(e) => setVoice(e.target.value)}>
          {voiceMappings.map((voice) => (
            <option key={voice.id} value={voice.id}>
              {voice.title}
            </option>
          ))}
        </select>
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
            // display: 'none',
            // zIndex: -100,
            // position: 'absolute',
            // opacity: 0,
            pointerEvents: 'none',
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
            ref={canvasRef}
          >
            <color attach="background" args={["#ececec"]} />
            <Avatar
              position={[0, -2.9, 0]}
              scale={1.9}
              lipsync={{ frameQueue, removeFrame, firstFrame }}
              currentAnimation={currentAnimation}
              greet={greet}
              toggleRecording={toggleRecording}
              audioDurationRef={audioDurationRef}
            />
            <Environment preset="sunset" />
            <OrbitControls />
          </Canvas>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <textarea
          style={{ height: "100px", width: "60vw" }}
          value={userInput}
          onInput={(e) => setUserInput(e.target.value)}
        />
        <button onClick={enQueue}>Speak</button>
      </div>


      <video style={{width: 500, height: 500}} ref={videoRef} autoPlay></video>
      <audio ref={audioRef} controls></audio>
      <button ref={recordButtonRef}>Start Recording</button>
      <button ref={playButtonRef}>Play</button>
      <button ref={downloadButtonRef}>Download</button>
    </>
  );
}

export default SpeechToText;

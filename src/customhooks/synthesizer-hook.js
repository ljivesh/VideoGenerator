import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpeechConfig } from "../modules/token_util";
import {
  AudioConfig,
  SpeechSynthesizer,
  SpeakerAudioDestination,
  PullAudioOutputStream,
  AvatarConfig,
  AvatarSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";

export const useSynthesize = (speechConfig) => {
  // const { speechConfig } = useSpeechConfig();

  // const player = useMemo(()=> new SpeakerAudioDestination(),[]);
  const [player, setPlayer] = useState(new SpeakerAudioDestination());

  const stopPlayer = useCallback(() => {
    setPlayer(new SpeakerAudioDestination());
    player.internalAudio.currentTime = player.internalAudio.duration;
  }, [player]);



  const audioConfig = useMemo(
    () => AudioConfig.fromSpeakerOutput(player),
    [player]
  );

  const speechSynthesizer = useMemo(() => {
    if (speechConfig && audioConfig)
      return new SpeechSynthesizer(speechConfig, null);
  }, [speechConfig, audioConfig]);


  // useEffect(() => {
  //   if(speechSynthesizer) {
  //     speechSynthesizer.visemeReceived = (s, e) => { 

  //       console.log(`Viseme received:`, JSON.parse(e.animation).BlendShapes);

  //     }


  //   }
    
  // }, [speechSynthesizer]);

  return {
    speechSynthesizer,
    player,
    stopPlayer,
  };
};

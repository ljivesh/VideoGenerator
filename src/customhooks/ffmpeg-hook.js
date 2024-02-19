import { useEffect, useRef, useState } from "react";
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
// const ffmpeg = createFFmpeg({ log: true });

export const useLoadFfmpeg = () => {
  const [ready, setReady] = useState(false);
  const ffmpegRef = useRef(createFFmpeg({log: true}))

  const ffmpeg = ffmpegRef.current;

  const load = async () => {
    try {
      await ffmpeg.load();
      setReady(true);
    } catch (error) {
      console.error(error);
    }

    console.log("here");
  };

  useEffect(() => {
    load();
  }, []);

  return { ready, ffmpeg };
};

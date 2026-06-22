import { Maximize2, Pause, Play } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export type VideoPreviewPaneHandle = {
  enterFullscreen: () => Promise<void>;
};

type Props = {
  src: string;
  title: string;
  className?: string;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

async function requestNativeFullscreen(
  video: HTMLVideoElement,
  stage: HTMLElement,
): Promise<void> {
  const iosVideo = video as FullscreenVideo;
  if (typeof iosVideo.webkitEnterFullscreen === "function") {
    iosVideo.webkitEnterFullscreen();
    return;
  }

  const target = stage as FullscreenElement;
  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }
  if (target.webkitRequestFullscreen) {
    await target.webkitRequestFullscreen();
    return;
  }

  throw new Error("Pantalla completa no disponible en este navegador");
}

const VideoPreviewPane = forwardRef<VideoPreviewPaneHandle, Props>(function VideoPreviewPane(
  { src, title, className },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage) return;
    try {
      await requestNativeFullscreen(video, stage);
    } catch {
      // Sin permiso o API no soportada.
    }
  }, []);

  useImperativeHandle(ref, () => ({ enterFullscreen }), [enterFullscreen]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        // El navegador puede bloquear la reproducción sin interacción previa.
      }
    } else {
      video.pause();
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setPlaying(true);
      setShowOverlay(false);
    };
    const onPause = () => {
      setPlaying(false);
      setShowOverlay(true);
    };
    const onEnded = () => {
      setPlaying(false);
      setShowOverlay(true);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    function syncFullscreenState() {
      const video = videoRef.current as FullscreenVideo | null;
      const stage = stageRef.current;
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active =
        document.fullscreenElement === stage ||
        doc.webkitFullscreenElement === stage ||
        Boolean(video?.webkitDisplayingFullscreen);
      setNativeFullscreen(active);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    const video = videoRef.current as FullscreenVideo | null;
    video?.addEventListener("webkitbeginfullscreen", syncFullscreenState);
    video?.addEventListener("webkitendfullscreen", syncFullscreenState);
    syncFullscreenState();

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
      video?.removeEventListener("webkitbeginfullscreen", syncFullscreenState);
      video?.removeEventListener("webkitendfullscreen", syncFullscreenState);
    };
  }, [src]);

  const rootClass = ["video-preview", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div
        ref={stageRef}
        className={[
          "video-preview__stage",
          nativeFullscreen && "video-preview__stage--native-fs",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => {
          if (playing) setShowOverlay(false);
        }}
      >
        <video
          ref={videoRef}
          className="video-preview__media"
          src={src}
          controls
          playsInline
          preload="metadata"
          title={title}
        />
        <button
          type="button"
          className={[
            "video-preview__play-btn",
            showOverlay || !playing ? "video-preview__play-btn--visible" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => void togglePlay()}
          aria-label={playing ? "Pausar" : "Reproducir"}
          title={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <Pause size={32} strokeWidth={2} fill="currentColor" aria-hidden />
          ) : (
            <Play size={32} strokeWidth={2} fill="currentColor" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className="video-preview__fs-btn"
          onClick={() => void enterFullscreen()}
          aria-label="Pantalla completa"
          title="Pantalla completa"
        >
          <Maximize2 size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
});

export default VideoPreviewPane;

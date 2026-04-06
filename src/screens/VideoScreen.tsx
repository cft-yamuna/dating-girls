import { useEffect, useState } from 'react';
import { getVideoState, subscribeToVideoState } from '../lib/controlState';
import { videoUrlMap } from '../lib/mediaCatalog';

export function VideoScreen() {
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);

  useEffect(() => {
    setCurrentVideo(getVideoState().currentVideo);

    return subscribeToVideoState((videoState) => {
      setCurrentVideo(videoState.currentVideo);
    });
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {currentVideo ? (
        <div className="w-full h-screen">
          <video
            key={currentVideo}
            className="w-full h-full object-contain"
            autoPlay
            src={videoUrlMap[currentVideo]}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      ) : (
        <div className="text-white text-4xl font-bold">
          Waiting for video...
        </div>
      )}
    </div>
  );
}

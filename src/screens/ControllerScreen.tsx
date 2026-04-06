import { useState, useEffect } from 'react';
import { Play, User } from 'lucide-react';
import {
  getUserState,
  getVideoState,
  subscribeToUserState,
  subscribeToVideoState,
  updateUserState,
  updateVideoState
} from '../lib/controlState';
import { people, videos } from '../lib/mediaCatalog';

export function ControllerScreen() {
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [currentPerson, setCurrentPerson] = useState<number | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    const videoState = getVideoState();
    const userState = getUserState();

    setCurrentVideo(videoState.currentVideo);
    setCurrentPerson(userState.currentPerson);
    setShowThankYou(userState.showThankYou);

    const unsubscribeVideo = subscribeToVideoState((nextVideoState) => {
      setCurrentVideo(nextVideoState.currentVideo);
    });

    const unsubscribeUser = subscribeToUserState((nextUserState) => {
      setCurrentPerson(nextUserState.currentPerson);
      setShowThankYou(nextUserState.showThankYou);
    });

    return () => {
      unsubscribeVideo();
      unsubscribeUser();
    };
  }, []);

  const playVideo = (videoName: string) => {
    updateVideoState({ currentVideo: videoName });
  };

  const showPerson = (personId: number) => {
    updateUserState({
      currentPerson: personId,
      showThankYou: false
    });
  };

  const stopVideo = () => {
    updateVideoState({ currentVideo: null });
  };

  const resetUserScreen = () => {
    updateUserState({
      currentPerson: 1,
      showThankYou: false
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-5xl font-bold mb-12 text-center">Control Center</h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Play className="text-red-500" size={32} />
            Video Control
          </h2>

          <div className="space-y-4">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => playVideo(video.id)}
                className={`w-full px-6 py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-105 ${
                  currentVideo === video.id
                    ? 'bg-red-600 shadow-lg shadow-red-500/50'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Play {video.label}
              </button>
            ))}
            <button
              onClick={stopVideo}
              className="w-full px-6 py-4 bg-gray-700 hover:bg-red-700 rounded-xl font-bold text-xl transition-all transform hover:scale-105 mt-4"
            >
              Stop Video
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded-xl">
            <p className="text-sm text-gray-300">Current Video:</p>
            <p className="text-xl font-bold">
              {videos.find((video) => video.id === currentVideo)?.label || 'None'}
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <User className="text-blue-500" size={32} />
            User Screen Control
          </h2>

          <div className="space-y-4">
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => showPerson(person.id)}
                className={`w-full px-6 py-4 rounded-xl font-bold text-xl transition-all transform hover:scale-105 ${
                  currentPerson === person.id && !showThankYou
                    ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Show {person.name}
              </button>
            ))}
            <button
              onClick={resetUserScreen}
              className="w-full px-6 py-4 bg-gray-700 hover:bg-blue-700 rounded-xl font-bold text-xl transition-all transform hover:scale-105 mt-4"
            >
              Reset User Screen
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-700 rounded-xl">
            <p className="text-sm text-gray-300">Current State:</p>
            <p className="text-xl font-bold">
              {showThankYou
                ? 'Thank You Screen'
                : currentPerson
                  ? people.find((person) => person.id === currentPerson)?.name
                  : 'Waiting'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-8 bg-gray-800 rounded-2xl p-6">
        <h3 className="text-2xl font-bold mb-4">Quick Links</h3>
        <div className="flex gap-4 flex-wrap">
          <a
            href="/?screen=video"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-all"
          >
            Open Video Screen
          </a>
          <a
            href="/?screen=user"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all"
          >
            Open User Screen
          </a>
        </div>
      </div>
    </div>
  );
}

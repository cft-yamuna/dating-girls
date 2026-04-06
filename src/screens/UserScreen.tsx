import { useEffect, useRef, useState } from 'react';
import { submitInteraction } from '../lib/controlState';
import { people } from '../lib/mediaCatalog';

const DEFAULT_THANK_YOU_IMAGE_SRC = '/thanks.png';
const THANK_YOU_IMAGE_BY_PERSON: Record<number, string> = {
  1: '/model1thanks.png',
  2: '/model2thanks.png'
};
const THANK_YOU_IMAGE_SOURCES = Array.from(
  new Set([DEFAULT_THANK_YOU_IMAGE_SRC, ...Object.values(THANK_YOU_IMAGE_BY_PERSON)])
);
const BACKGROUND_IMAGE_SRC = '/bg.png';
const TEXT_IMAGE_SRC = '/text.png';
const LIKE_IMAGE_SRC = '/like.png';
const REJECT_IMAGE_SRC = '/reject.png';
const selectablePeople = people.filter((person) => person.id === 1 || person.id === 2);

export function UserScreen() {
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [lastAction, setLastAction] = useState<'like' | 'reject' | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [loadedThankYouImages, setLoadedThankYouImages] = useState<Record<string, boolean>>({});
  const [failedThankYouImages, setFailedThankYouImages] = useState<Record<string, boolean>>({});
  const pendingInteractionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setShowThankYou(false);
  }, []);

  useEffect(() => {
    const preloadImages = THANK_YOU_IMAGE_SOURCES.map((imageSrc) => {
      const image = new Image();

      image.decoding = 'async';
      image.onload = () => {
        setLoadedThankYouImages((previous) => ({ ...previous, [imageSrc]: true }));
      };
      image.onerror = () => {
        console.error(`[UserScreen] failed to preload ${imageSrc}`);
        setFailedThankYouImages((previous) => ({ ...previous, [imageSrc]: true }));
      };

      image.src = imageSrc;

      if (image.complete) {
        setLoadedThankYouImages((previous) => ({ ...previous, [imageSrc]: true }));
      }

      return image;
    });

    return () => {
      preloadImages.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });

      if (pendingInteractionTimeoutRef.current !== null) {
        window.clearTimeout(pendingInteractionTimeoutRef.current);
      }
    };
  }, []);

  const handleAction = (action: 'like' | 'reject') => {
    if (selectedPersonId === null) return;
    if (showThankYou) return;

    const personId = selectedPersonId;

    console.log('[UserScreen] action clicked', {
      personId,
      action,
      clickedAt: new Date().toISOString()
    });

    setLastAction(action);
    setShowThankYou(true);

    pendingInteractionTimeoutRef.current = window.setTimeout(() => {
      submitInteraction(personId, action);
      pendingInteractionTimeoutRef.current = null;
    }, 0);
  };

  const hasSelection = selectedPersonId !== null;
  const preferredThankYouImageSrc =
    lastAction === 'like' && selectedPersonId !== null
      ? THANK_YOU_IMAGE_BY_PERSON[selectedPersonId] ?? DEFAULT_THANK_YOU_IMAGE_SRC
      : DEFAULT_THANK_YOU_IMAGE_SRC;
  const thankYouImageSrc = failedThankYouImages[preferredThankYouImageSrc]
    ? DEFAULT_THANK_YOU_IMAGE_SRC
    : loadedThankYouImages[preferredThankYouImageSrc]
      ? preferredThankYouImageSrc
      : loadedThankYouImages[DEFAULT_THANK_YOU_IMAGE_SRC]
        ? DEFAULT_THANK_YOU_IMAGE_SRC
        : preferredThankYouImageSrc;
  const isThankYouImageReady = loadedThankYouImages[thankYouImageSrc];
  const thankYouImageFailed = failedThankYouImages[thankYouImageSrc];

  if (showThankYou) {
    return (
      <div className="relative min-h-screen bg-black overflow-hidden">
        {thankYouImageFailed || !isThankYouImageReady ? (
          <div className="flex min-h-screen items-center justify-center bg-black text-white">
            <p className="text-3xl font-semibold">Thank you</p>
          </div>
        ) : (
          <img
            src={thankYouImageSrc}
            alt="Thank you"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            onError={() => {
              console.error(`[UserScreen] failed to load ${thankYouImageSrc}`);
              setFailedThankYouImages((previous) => ({
                ...previous,
                [thankYouImageSrc]: true
              }));
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <img
        src={BACKGROUND_IMAGE_SRC}
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6">
          <div className="mt-[4vh] flex w-full max-w-[760px] flex-col items-center gap-4 sm:gap-6">
            <img
              src={TEXT_IMAGE_SRC}
              alt="Text"
              className="h-auto w-full max-w-[560px] object-contain"
            />

            <div className="grid w-full max-w-[680px] grid-cols-2 items-end gap-3 sm:gap-5">
              {selectablePeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`overflow-hidden rounded-2xl transition-transform duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80 ${
                    selectedPersonId === person.id
                      ? 'ring-4 ring-white/80 scale-[1.01]'
                      : 'hover:scale-[1.01]'
                  }`}
                  aria-label={`Select ${person.name}`}
                >
                  <img
                    src={person.image}
                    alt={person.name}
                    className="h-[280px] w-full object-cover sm:h-[460px]"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex h-20 items-center justify-center gap-4 sm:h-24 sm:gap-6">
            <button
              type="button"
              onClick={() => handleAction('reject')}
              disabled={showThankYou || !hasSelection}
              className={`appearance-none border-0 bg-transparent p-0 transition-all duration-150 disabled:cursor-default ${
                hasSelection ? 'opacity-100 hover:scale-105' : 'pointer-events-none opacity-0'
              }`}
              aria-label="Reject"
            >
              <img
                src={REJECT_IMAGE_SRC}
                alt="Reject"
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            </button>
            <button
              type="button"
              onClick={() => handleAction('like')}
              disabled={showThankYou || !hasSelection}
              className={`appearance-none border-0 bg-transparent p-0 transition-all duration-150 disabled:cursor-default ${
                hasSelection ? 'opacity-100 hover:scale-105' : 'pointer-events-none opacity-0'
              }`}
              aria-label="Like"
            >
              <img
                src={LIKE_IMAGE_SRC}
                alt="Like"
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

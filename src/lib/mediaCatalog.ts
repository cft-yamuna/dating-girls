export type PersonProfile = {
  id: number;
  name: string;
  image: string;
};

export type VideoOption = {
  id: string;
  label: string;
  src: string;
};

export const people: PersonProfile[] = [
  {
    id: 1,
    name: 'Model 1',
    image: '/model1.png'
  },
  {
    id: 2,
    name: 'Model 2',
    image: '/model2.png'
  },
  {
    id: 3,
    name: 'Model 3',
    image: '/model3.png'
  }
];

export const videos: VideoOption[] = [
  {
    id: 'video1',
    label: 'Video 1',
    src: '/video1.mp4'
  },
  {
    id: 'video2',
    label: 'Video 2',
    src: '/video2.mp4'
  },
  {
    id: 'video3',
    label: 'Video 3',
    src: '/video3.mp4'
  }
];

export const videoUrlMap = Object.fromEntries(
  videos.map((video) => [video.id, video.src])
) as Record<string, string>;

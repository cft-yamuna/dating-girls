import { CONTROL_STATE_ROW_ID, hasSupabaseConfig, supabase } from './supabase';

export type VideoState = {
  currentVideo: string | null;
};

export type UserState = {
  currentPerson: number | null;
  showThankYou: boolean;
};

export type Interaction = {
  personId: number;
  action: 'like' | 'reject';
  createdAt: string;
};

type ControlSnapshot = {
  video: VideoState;
  user: UserState;
  interactions: Interaction[];
};

type RemoteControlStateRow = {
  id: number;
  video_state: VideoState;
  user_state: UserState;
  interactions: Interaction[];
};

const STORAGE_KEYS = {
  video: 'control-system:video-state',
  user: 'control-system:user-state',
  interactions: 'control-system:interactions'
} as const;

const defaults = {
  video: { currentVideo: null } satisfies VideoState,
  user: { currentPerson: 1, showThankYou: false } satisfies UserState,
  interactions: [] as Interaction[]
};

const channel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('control-system')
    : null;
let remoteSyncStarted = false;
let remoteStream: EventSource | null = null;
const controlServerUrl = (import.meta.env.VITE_CONTROL_SERVER_URL || '').trim();
const controlApiBase = controlServerUrl
  ? `${controlServerUrl.replace(/\/+$/, '')}/api/control-state`
  : '/api/control-state';

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function areEqual(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function notifyChange(key: string) {
  window.dispatchEvent(new CustomEvent('control-state-change', { detail: { key } }));
  channel?.postMessage({ key });
}

function readSnapshotFromStorage(): ControlSnapshot {
  return {
    video: readStorage(STORAGE_KEYS.video, defaults.video),
    user: readStorage(STORAGE_KEYS.user, defaults.user),
    interactions: readStorage(STORAGE_KEYS.interactions, defaults.interactions)
  };
}

function mapRemoteRowToSnapshot(row: RemoteControlStateRow): ControlSnapshot {
  return {
    video: row.video_state ?? defaults.video,
    user: row.user_state ?? defaults.user,
    interactions: row.interactions ?? defaults.interactions
  };
}

function applyRemoteSnapshot(snapshot: ControlSnapshot) {
  const nextValues = [
    {
      key: STORAGE_KEYS.video,
      value: snapshot.video,
      current: readStorage(STORAGE_KEYS.video, defaults.video)
    },
    {
      key: STORAGE_KEYS.user,
      value: snapshot.user,
      current: readStorage(STORAGE_KEYS.user, defaults.user)
    },
    {
      key: STORAGE_KEYS.interactions,
      value: snapshot.interactions,
      current: readStorage(STORAGE_KEYS.interactions, defaults.interactions)
    }
  ] as const;

  nextValues.forEach(({ key, value, current }) => {
    if (!areEqual(current, value)) {
      writeStorage(key, value);
      notifyChange(key);
    }
  });
}

async function ensureSupabaseRow() {
  if (!supabase) {
    return;
  }

  const snapshot = readSnapshotFromStorage();

  await supabase.from('control_state').upsert({
    id: CONTROL_STATE_ROW_ID,
    video_state: snapshot.video,
    user_state: snapshot.user,
    interactions: snapshot.interactions
  });
}

async function requestSupabaseSnapshot() {
  if (!supabase) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from('control_state')
      .select('id, video_state, user_state, interactions')
      .eq('id', CONTROL_STATE_ROW_ID)
      .maybeSingle();

    if (error) {
      console.error('[controlState] failed to fetch Supabase state', error);
      return;
    }

    if (!data) {
      await ensureSupabaseRow();
      return;
    }

    applyRemoteSnapshot(mapRemoteRowToSnapshot(data as RemoteControlStateRow));
  } catch (error) {
    console.error('[controlState] Supabase snapshot request failed', error);
  }
}

async function requestRemoteSnapshot() {
  if (typeof window === 'undefined') {
    return;
  }

  if (hasSupabaseConfig) {
    await requestSupabaseSnapshot();
    return;
  }

  try {
    const response = await fetch(controlApiBase, { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const snapshot = (await response.json()) as ControlSnapshot;
    applyRemoteSnapshot(snapshot);
  } catch {
    // Local-only mode remains available when the shared dev endpoint is not running.
  }
}

function startRemoteSync() {
  if (typeof window === 'undefined' || remoteSyncStarted) {
    return;
  }

  remoteSyncStarted = true;

  if (hasSupabaseConfig && supabase) {
    const supabaseClient = supabase;
    void requestSupabaseSnapshot();

    supabaseClient
      .channel('control-state-row')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'control_state',
          filter: `id=eq.${CONTROL_STATE_ROW_ID}`
        },
        (payload) => {
          const nextRow =
            payload.eventType === 'DELETE'
              ? null
              : (payload.new as RemoteControlStateRow | undefined);

          if (nextRow) {
            applyRemoteSnapshot(mapRemoteRowToSnapshot(nextRow));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void requestSupabaseSnapshot();
        }
      });
    return;
  }

  void requestRemoteSnapshot();

  try {
    remoteStream = new EventSource(`${controlApiBase}/stream`);
    remoteStream.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data) as ControlSnapshot;
        applyRemoteSnapshot(snapshot);
      } catch {
        // Ignore malformed sync payloads.
      }
    };

    remoteStream.onerror = () => {
      // The browser auto-reconnects SSE. Keep local storage as fallback.
    };
  } catch {
    remoteStream = null;
  }
}

async function pushRemote<T>(path: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  if (hasSupabaseConfig && supabase) {
    const snapshot = readSnapshotFromStorage();
    const supabaseClient = supabase;

    try {
      const { error } = await supabaseClient.from('control_state').upsert({
        id: CONTROL_STATE_ROW_ID,
        video_state: snapshot.video,
        user_state: snapshot.user,
        interactions: snapshot.interactions
      });

      if (error) {
        console.error('[controlState] failed to push Supabase state', error);
      }
    } catch (error) {
      console.error('[controlState] Supabase push failed', error);
    }
    return;
  }

  try {
    await fetch(`${controlApiBase}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
  } catch {
    // Local-only mode remains available when the shared dev endpoint is not running.
  }
}

function subscribeToKey<T>(key: string, readValue: () => T, callback: (value: T) => void) {
  startRemoteSync();

  const emitLatest = () => callback(readValue());

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) {
      emitLatest();
    }
  };

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ key?: string }>;
    if (customEvent.detail?.key === key) {
      emitLatest();
    }
  };

  const handleChannelMessage = (event: MessageEvent<{ key?: string }>) => {
    if (event.data?.key === key) {
      emitLatest();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('control-state-change', handleCustomEvent);
  channel?.addEventListener('message', handleChannelMessage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('control-state-change', handleCustomEvent);
    channel?.removeEventListener('message', handleChannelMessage);
  };
}

export function getVideoState(): VideoState {
  startRemoteSync();
  return readStorage(STORAGE_KEYS.video, defaults.video);
}

export function updateVideoState(nextState: Partial<VideoState>) {
  const updatedState = { ...getVideoState(), ...nextState };
  writeStorage(STORAGE_KEYS.video, updatedState);
  notifyChange(STORAGE_KEYS.video);
  void pushRemote('video', updatedState);
}

export function subscribeToVideoState(callback: (value: VideoState) => void) {
  return subscribeToKey(STORAGE_KEYS.video, getVideoState, callback);
}

export function getUserState(): UserState {
  startRemoteSync();
  return readStorage(STORAGE_KEYS.user, defaults.user);
}

export function updateUserState(nextState: Partial<UserState>) {
  const updatedState = { ...getUserState(), ...nextState };
  writeStorage(STORAGE_KEYS.user, updatedState);
  notifyChange(STORAGE_KEYS.user);
  void pushRemote('user', updatedState);
}

export function subscribeToUserState(callback: (value: UserState) => void) {
  return subscribeToKey(STORAGE_KEYS.user, getUserState, callback);
}

export function getInteractions(): Interaction[] {
  startRemoteSync();
  return readStorage(STORAGE_KEYS.interactions, defaults.interactions);
}

export function recordInteraction(interaction: Omit<Interaction, 'createdAt'>) {
  const updatedInteractions = [
    ...getInteractions(),
    { ...interaction, createdAt: new Date().toISOString() }
  ];
  writeStorage(STORAGE_KEYS.interactions, updatedInteractions);
  notifyChange(STORAGE_KEYS.interactions);
  void pushRemote('interactions', updatedInteractions);
}

export function submitInteraction(personId: number, action: Interaction['action']) {
  // Keep thank-you behavior local to each device. Only the interaction log is shared.
  recordInteraction({ personId, action });
}

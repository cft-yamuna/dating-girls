import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

type VideoState = {
  currentVideo: string | null;
};

type UserState = {
  currentPerson: number | null;
  showThankYou: boolean;
};

type Interaction = {
  personId: number;
  action: 'like' | 'reject';
  createdAt: string;
};

type ControlSnapshot = {
  video: VideoState;
  user: UserState;
  interactions: Interaction[];
};

const defaultSnapshot: ControlSnapshot = {
  video: { currentVideo: null },
  user: { currentPerson: 1, showThankYou: false },
  interactions: []
};

function controlStatePlugin() {
  let snapshot: ControlSnapshot = structuredClone(defaultSnapshot);
  const clients = new Set<ServerResponse<IncomingMessage>>();

  const sendSnapshot = (response: ServerResponse<IncomingMessage>) => {
    response.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  const broadcastSnapshot = () => {
    for (const client of clients) {
      sendSnapshot(client);
    }
  };

  const readBody = async (request: IncomingMessage) => {
    const chunks: Uint8Array[] = [];

    for await (const chunk of request) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const rawBody = Buffer.concat(chunks).toString('utf8');
    return rawBody ? JSON.parse(rawBody) : null;
  };

  return {
    name: 'control-state-plugin',
    configureServer(server: { middlewares: { use: (handler: (request: IncomingMessage, response: ServerResponse<IncomingMessage>, next: () => void) => void) => void } }) {
      server.middlewares.use(async (request, response, next) => {
        const { method, url } = request;

        if (!url?.startsWith('/api/control-state')) {
          next();
          return;
        }

        if (method === 'GET' && url === '/api/control-state') {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(snapshot));
          return;
        }

        if (method === 'GET' && url === '/api/control-state/stream') {
          response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
          });
          response.write('\n');

          clients.add(response);
          sendSnapshot(response);

          request.on('close', () => {
            clients.delete(response);
          });
          return;
        }

        if (method === 'POST' && url === '/api/control-state/video') {
          const nextVideo = await readBody(request);
          snapshot = { ...snapshot, video: nextVideo };
          broadcastSnapshot();
          response.statusCode = 204;
          response.end();
          return;
        }

        if (method === 'POST' && url === '/api/control-state/user') {
          const nextUser = await readBody(request);
          snapshot = { ...snapshot, user: nextUser };
          broadcastSnapshot();
          response.statusCode = 204;
          response.end();
          return;
        }

        if (method === 'POST' && url === '/api/control-state/interactions') {
          const nextInteractions = await readBody(request);
          snapshot = { ...snapshot, interactions: nextInteractions };
          broadcastSnapshot();
          response.statusCode = 204;
          response.end();
          return;
        }

        next();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), controlStatePlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

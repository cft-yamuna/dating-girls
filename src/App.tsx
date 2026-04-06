import { VideoScreen } from './screens/VideoScreen';
import { UserScreen } from './screens/UserScreen';
import { ControllerScreen } from './screens/ControllerScreen';

function App() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen');

  if (screen === 'video') {
    return <VideoScreen />;
  }

  if (screen === 'user') {
    return <UserScreen />;
  }

  if (screen === 'controller') {
    return <ControllerScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl">
        <h1 className="text-5xl font-bold text-gray-800 mb-8 text-center">
          Multi-Screen Control System
        </h1>
        <p className="text-xl text-gray-600 mb-12 text-center">
          Choose a screen to open:
        </p>

        <div className="space-y-6">
          <a
            href="/?screen=controller"
            className="block px-8 py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-bold text-2xl text-center transition-all transform hover:scale-105 shadow-lg"
          >
            Controller Screen
          </a>
          <a
            href="/?screen=video"
            className="block px-8 py-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-2xl font-bold text-2xl text-center transition-all transform hover:scale-105 shadow-lg"
          >
            Video Screen
          </a>
          <a
            href="/?screen=user"
            className="block px-8 py-6 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-2xl font-bold text-2xl text-center transition-all transform hover:scale-105 shadow-lg"
          >
            User Screen
          </a>
        </div>

        <div className="mt-12 p-6 bg-gray-100 rounded-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Instructions:</h2>
          <ul className="text-gray-700 space-y-2">
            <li>1. Open Controller Screen to control everything</li>
            <li>2. Open Video Screen in a separate window/tab</li>
            <li>3. Open User Screen in another window/tab</li>
            <li>4. Use Controller to manage both screens in real-time on this browser/device</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useNavigate } from 'react-router-dom';
import { clearSession } from '../utils/storage';

export default function TimerDonePage() {
  const navigate = useNavigate();

  const handleRestart = () => {
    clearSession();
    navigate('/timer');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-4">Time’s up.</h1>
        <button
          onClick={handleRestart}
          className="rounded-md bg-orange-500 text-white px-4 py-2 font-medium hover:bg-orange-600"
        >
          Restart
        </button>
      </div>
    </div>
  );
}

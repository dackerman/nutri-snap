import { useLocation } from "wouter";

export default function NavBar() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="bg-white border-t border-gray-200 shadow-sm fixed bottom-0 left-0 right-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex justify-around">
          <button 
            className={`py-3 px-5 flex flex-col items-center ${location === '/' ? 'text-primary' : 'text-gray-500'}`}
            onClick={() => setLocation('/')}
          >
            <span className="material-icons">home</span>
            <span className="text-xs mt-1">Today</span>
          </button>
          <button className="py-3 px-5 text-gray-500 flex flex-col items-center">
            <span className="material-icons">history</span>
            <span className="text-xs mt-1">History</span>
          </button>
          <button className="py-3 px-5 text-gray-500 flex flex-col items-center">
            <span className="material-icons">insights</span>
            <span className="text-xs mt-1">Trends</span>
          </button>
          <button className="py-3 px-5 text-gray-500 flex flex-col items-center">
            <span className="material-icons">person</span>
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

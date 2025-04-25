import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import nutriSnapLogo from "@/assets/nutrisnap-logo.png";

export default function NavBar() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
          <button 
            className={`py-3 px-5 flex flex-col items-center ${location === '/add' ? 'text-primary' : 'text-gray-500'}`}
            onClick={() => setLocation('/add')}
          >
            <span className="material-icons">add_circle</span>
            <span className="text-xs mt-1">Add Meal</span>
          </button>
          <button 
            className={`py-3 px-5 flex flex-col items-center ${location === '/calendar' ? 'text-primary' : 'text-gray-500'}`}
            onClick={() => setLocation('/calendar')}
          >
            <span className="material-icons">calendar_month</span>
            <span className="text-xs mt-1">Calendar</span>
          </button>
          <button 
            className="py-3 px-5 text-gray-500 flex flex-col items-center"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs mt-1">Logging out</span>
              </>
            ) : (
              <>
                <span className="material-icons">logout</span>
                <span className="text-xs mt-1">Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

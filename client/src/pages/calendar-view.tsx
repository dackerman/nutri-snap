import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import MonthlyCalendar from "@/components/monthly-calendar";
import NavBar from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArrowLeftIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import DailySummary from "@/components/daily-summary";

export default function CalendarView() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Handle date selection from the calendar
  const handleDateSelected = (date: Date) => {
    setSelectedDate(date);
    // Fetch the daily summary for the selected date
    refetch();
  };
  
  // Query to fetch the daily summary for the selected date
  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['/api/summary', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/summary?date=${format(selectedDate, 'yyyy-MM-dd')}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch daily summary');
      }
      
      return response.json();
    }
  });
  
  // Handle adding a meal for the selected date
  const handleAddMeal = () => {
    const dateParam = selectedDate.toISOString();
    setLocation(`/add?date=${encodeURIComponent(dateParam)}`);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="container px-4 py-3 mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-0 h-8 w-8"
              onClick={() => setLocation('/')}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold text-primary-dark">Monthly View</h1>
          </div>
          {user && (
            <div className="text-sm font-medium text-gray-700">
              Hi, {user.name || user.email.split('@')[0]}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-14 mb-16 container mx-auto px-4 py-4">
        {/* Monthly Calendar */}
        <div className="mb-6">
          <MonthlyCalendar onDateSelected={handleDateSelected} />
        </div>
        
        {/* Selected Date Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Summary for {format(selectedDate, "MMMM d, yyyy")}
          </h2>
          
          {isLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-40 w-full bg-gray-200 rounded"></div>
            </div>
          ) : summary ? (
            <DailySummary
              calories={summary.calories || 0}
              fat={summary.fat || 0}
              carbs={summary.carbs || 0}
              protein={summary.protein || 0}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-500">No data available for this date</p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col items-center gap-2">
          <Button 
            variant="default" 
            className="w-full bg-primary hover:bg-primary-dark"
            onClick={handleAddMeal}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Meal for {format(selectedDate, "MMM d")}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation(`/?date=${encodeURIComponent(selectedDate.toISOString())}`)}
          >
            View Day Details
          </Button>
        </div>
      </main>

      {/* Animated Add Food Button */}
      <motion.div 
        className="fixed bottom-20 right-4 z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20, 
          delay: 0.3 
        }}
        whileHover={{ 
          scale: 1.1,
          rotate: 5,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.9 }}
      >
        <button
          onClick={handleAddMeal}
          className="bg-primary hover:bg-primary-dark text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all"
        >
          <PlusIcon />
        </button>
      </motion.div>

      {/* Navigation */}
      <NavBar />
    </div>
  );
}
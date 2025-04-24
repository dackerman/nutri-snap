import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import DailySummary from "@/components/daily-summary";
import MealCard from "@/components/meal-card";
import NavBar from "@/components/nav-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, PlusIcon } from "lucide-react";
import type { Meal } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import nutriSnapLogo from "@/assets/nutrisnap-logo.png";
import { format, addDays, isSameDay } from "date-fns";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const dateString = selectedDate.toISOString().split('T')[0];

  // Get the user's timezone offset
  const timezoneOffset = new Date().getTimezoneOffset();
  
  // Function to navigate to previous day
  const navigateToPreviousDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  // Function to navigate to next day
  const navigateToNextDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 1);
      // Don't allow navigating to future dates
      return newDate > today ? today : newDate;
    });
  };

  // Function to navigate to today
  const navigateToToday = () => {
    setSelectedDate(today);
  };

  // Check if selected date is today
  const isToday = isSameDay(selectedDate, today);

  // Fetch selected day's meals with timezone offset
  const { data: meals, isLoading: mealsLoading } = useQuery<Meal[]>({
    queryKey: ['/api/meals', dateString, timezoneOffset],
    queryFn: async () => {
      const response = await fetch(`/api/meals?date=${dateString}&tzOffset=${timezoneOffset}`);
      return response.json();
    },
    // Add refetch interval to periodically check for updates
    refetchInterval: isToday ? 60000 : false, // Only refetch automatically if viewing today
  });

  // Fetch nutritional summary with timezone offset
  const { data: summary, isLoading: summaryLoading } = useQuery<{calories: number, fat: number, carbs: number, protein: number}>({
    queryKey: ['/api/summary', dateString, timezoneOffset],
    queryFn: async () => {
      const response = await fetch(`/api/summary?date=${dateString}&tzOffset=${timezoneOffset}`);
      return response.json();
    },
    // Also refetch the summary on the same schedule
    refetchInterval: isToday ? 60000 : false,
  });

  const handleAddFood = () => {
    // Pass the selected date to the add meal page
    const dateParam = selectedDate.toISOString();
    setLocation(`/add?date=${encodeURIComponent(dateParam)}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="container px-4 py-3 mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <img src={nutriSnapLogo} alt="NutriSnap Logo" className="w-8 h-8 mr-2" />
            <h1 className="text-xl font-semibold text-primary-dark">NutriSnap</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="text-sm font-medium text-gray-700 mr-2">
                Hi, {user.name || user.email.split('@')[0]}
              </div>
            )}
            <button className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100">
              <span className="material-icons text-gray-600">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-14 mb-16 container mx-auto px-4 py-4">
        {/* Daily Summary */}
        {summaryLoading ? (
          <div className="mb-6">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-48 w-full rounded-xl mb-5" />
          </div>
        ) : (
          <DailySummary
            calories={summary?.calories ?? 0}
            fat={summary?.fat ?? 0}
            carbs={summary?.carbs ?? 0}
            protein={summary?.protein ?? 0}
          />
        )}

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-3 shadow-sm">
          <button 
            onClick={navigateToPreviousDay}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 font-normal justify-center text-gray-700"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>{format(selectedDate, "MMMM d, yyyy")}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > today}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <button 
            onClick={navigateToNextDay}
            className={`p-2 rounded-full transition-colors ${
              isToday ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600'
            }`}
            disabled={isToday}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Food Timeline */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {isToday ? "Today's Meals" : `Meals for ${format(selectedDate, "MMMM d")}`}
            </h2>
            {!isToday && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={navigateToToday}
                className="text-xs"
              >
                Back to Today
              </Button>
            )}
          </div>

          {mealsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : meals?.length && meals.length > 0 ? (
            <div className="space-y-4">
              {meals.map((meal, index) => (
                <MealCard key={meal.id} meal={meal} index={index} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="material-icons text-gray-400 text-3xl mb-2">restaurant</span>
              <p className="text-gray-500">
                {isToday 
                  ? "No meals added today" 
                  : `No meals recorded for ${format(selectedDate, "MMMM d, yyyy")}`
                }
              </p>
              {isToday ? (
                <Button 
                  onClick={handleAddFood}
                  className="mt-4 bg-primary hover:bg-primary-dark"
                >
                  Add Your First Meal
                </Button>
              ) : (
                <div className="mt-4 text-sm text-gray-500">
                  You can add meals for past dates by changing the date after clicking "Add Meal"
                </div>
              )}
            </div>
          )}
        </section>
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
          onClick={handleAddFood}
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

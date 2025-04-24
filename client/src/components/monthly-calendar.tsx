import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { DailySummary } from "@/components/daily-summary";

// Define the monthly calendar props
interface MonthlyCalendarProps {
  onDateSelected?: (date: Date) => void;
}

export default function MonthlyCalendar({ onDateSelected }: MonthlyCalendarProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthData, setMonthData] = useState<Map<string, DailySummary>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Maximum calories for color gradient calculation (can be adjusted based on user goals)
  const MAX_CALORIES = 2500;

  // Get all days in the current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Function to navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  // Function to navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  // Function to handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateSelected) {
      onDateSelected(date);
    }
  };

  // Function to format the date key for the Map
  const formatDateKey = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  // Load calorie data for the entire month
  useEffect(() => {
    if (!user) return;
    
    const fetchMonthData = async () => {
      setIsLoading(true);
      
      try {
        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);
        
        // Create a new Map to store the data
        const newMonthData = new Map<string, DailySummary>();
        
        // Fetch data for each day in the month
        for (const day of daysInMonth) {
          const dateKey = formatDateKey(day);
          
          try {
            // Fetch the daily summary for this date
            const response = await fetch(`/api/summary?date=${format(day, 'yyyy-MM-dd')}`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              newMonthData.set(dateKey, data);
            } else {
              // Set default values if the request fails
              newMonthData.set(dateKey, { calories: 0, fat: 0, carbs: 0, protein: 0 });
            }
          } catch (error) {
            console.error(`Error fetching data for ${dateKey}:`, error);
            // Set default values for days with errors
            newMonthData.set(dateKey, { calories: 0, fat: 0, carbs: 0, protein: 0 });
          }
        }
        
        setMonthData(newMonthData);
      } catch (error) {
        console.error("Error fetching month data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMonthData();
  }, [currentMonth, user, daysInMonth]);

  // Function to calculate the color based on calories
  const getCalorieColor = (calories: number): string => {
    if (calories === 0) return 'bg-gray-100'; // No data
    
    // Calculate percentage of MAX_CALORIES
    const percentage = Math.min(calories / MAX_CALORIES, 1);
    
    if (percentage < 0.25) {
      return 'bg-green-100';
    } else if (percentage < 0.5) {
      return 'bg-green-200';
    } else if (percentage < 0.75) {
      return 'bg-yellow-200';
    } else if (percentage < 1) {
      return 'bg-orange-200';
    } else {
      return 'bg-red-200';
    }
  };

  // Generate the day cells for the calendar
  const renderCalendarCells = () => {
    // Get day names for the header
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Calendar header with day names */}
        {dayNames.map(day => (
          <div 
            key={day} 
            className="text-center py-2 text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {daysInMonth.map((day, i) => {
          const dateKey = formatDateKey(day);
          const daySummary = monthData.get(dateKey) || { calories: 0, fat: 0, carbs: 0, protein: 0 };
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);
          const isDifferentMonth = !isSameMonth(day, currentMonth);
          
          return (
            <motion.div
              key={i}
              className={`
                relative rounded-md overflow-hidden cursor-pointer transition-all
                ${isToday ? 'ring-2 ring-primary' : ''}
                ${isSelected ? 'ring-2 ring-primary-dark' : ''}
                ${isDifferentMonth ? 'opacity-40' : ''}
                ${getCalorieColor(daySummary.calories)}
              `}
              onClick={() => handleDateClick(day)}
              whileHover={{ scale: 0.95 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="aspect-square flex flex-col items-center justify-center p-1">
                <div className="text-sm font-medium">{format(day, 'd')}</div>
                {!isLoading && (
                  <div className="text-xs font-semibold mt-1">
                    {daySummary.calories > 0 ? `${daySummary.calories} cal` : ''}
                  </div>
                )}
                {isLoading && (
                  <div className="w-10 h-3 bg-gray-200 animate-pulse rounded mt-1"></div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="bg-white p-4 shadow-sm rounded-xl">
      {/* Calendar header with month/year and navigation buttons */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Calendar grid */}
      {renderCalendarCells()}
      
      {/* Legend */}
      <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-100 rounded mr-1"></div>
          <span>No data</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 rounded mr-1"></div>
          <span>&lt;625 cal</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-200 rounded mr-1"></div>
          <span>&lt;1250 cal</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-200 rounded mr-1"></div>
          <span>&lt;1875 cal</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-200 rounded mr-1"></div>
          <span>&lt;2500 cal</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-200 rounded mr-1"></div>
          <span>≥2500 cal</span>
        </div>
      </div>
    </Card>
  );
}
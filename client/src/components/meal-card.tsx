import { formatTimeFromDate } from "@/lib/utils";
import type { Meal } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";

interface MealCardProps {
  meal: Meal;
  index?: number; // Optional index for staggered animations
}

export default function MealCard({ meal, index = 0 }: MealCardProps) {
  const { id, mealType, foodName, brandName, description, imageUrl, calories, fat, carbs, protein, quantity, unit, timestamp, analysisPending } = meal;
  const [isExpanded, setIsExpanded] = useState(false);
  const [, setLocation] = useLocation();
  
  // Format time
  const timeString = formatTimeFromDate(new Date(timestamp));
  
  // Capitalize meal type
  const formattedMealType = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  // Handle click to navigate to detail view
  const handleClick = () => {
    setLocation(`/meals/${id}`);
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3,
        delay: index * 0.05 // Staggered animation based on index
      }}
      whileHover={{ 
        y: -5,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-800">{formattedMealType}</h3>
            {foodName ? (
              <div>
                <p className="text-sm font-medium text-gray-700">{foodName}</p>
                {brandName && (
                  <p className="text-xs text-gray-500">Brand: {brandName}</p>
                )}
                {quantity && unit && (
                  <p className="text-xs text-gray-500">Serving: {quantity} {unit}</p>
                )}
              </div>
            ) : analysisPending ? (
              <motion.p 
                className="text-sm font-medium text-gray-500 italic"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                Detecting food name...
              </motion.p>
            ) : (
              <p className="text-sm font-medium text-gray-500 italic">Unidentified food</p>
            )}
            <p className="text-sm text-gray-500">{timeString}</p>
          </div>
          <div className="text-right">
            {analysisPending ? (
              <div className="flex items-center justify-end">
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                <motion.span 
                  className="text-sm text-gray-500"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  Analyzing...
                </motion.span>
              </div>
            ) : (
              <>
                <div className="font-semibold text-gray-800">{calories} kcal</div>
                <div className="text-xs text-gray-500">
                  {fat}g fat · {carbs}g carbs · {protein || 0}g protein
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Image and description section with conditional expansion */}
      <motion.div
        className="px-4 pb-4 overflow-hidden"
        initial={{ height: (imageUrl || description) ? "auto" : 0 }}
        animate={{ 
          height: (isExpanded || (imageUrl && description)) ? "auto" : 0,
          opacity: (isExpanded || (imageUrl && description)) ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={description || "Food image"} 
              className="rounded-lg h-16 w-16 object-cover"
            />
          )}
          {description && (
            <div className="text-sm text-gray-600">
              {description}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Animated progress indicator for pending analysis */}
      {analysisPending && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
            <motion.div 
              className="bg-primary h-1"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "linear" 
              }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">
            AI is analyzing your meal...
          </p>
        </div>
      )}
    </motion.div>
  );
}

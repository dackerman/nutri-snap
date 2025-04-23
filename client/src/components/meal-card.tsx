import { formatTimeFromDate } from "@/lib/utils";
import type { Meal } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface MealCardProps {
  meal: Meal;
}

export default function MealCard({ meal }: MealCardProps) {
  const { mealType, foodName, description, imageUrl, calories, fat, carbs, timestamp, analysisPending } = meal;
  
  // Format time
  const timeString = formatTimeFromDate(new Date(timestamp));
  
  // Capitalize meal type
  const formattedMealType = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-800">{formattedMealType}</h3>
            {foodName ? (
              <p className="text-sm font-medium text-gray-700">{foodName}</p>
            ) : analysisPending ? (
              <p className="text-sm font-medium text-gray-500 italic">Detecting food name...</p>
            ) : (
              <p className="text-sm font-medium text-gray-500 italic">Unidentified food</p>
            )}
            <p className="text-sm text-gray-500">{timeString}</p>
          </div>
          <div className="text-right">
            {analysisPending ? (
              <div className="flex items-center justify-end">
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                <span className="text-sm text-gray-500">Analyzing...</span>
              </div>
            ) : (
              <>
                <div className="font-semibold text-gray-800">{calories} kcal</div>
                <div className="text-xs text-gray-500">{fat}g fat · {carbs}g carbs</div>
              </>
            )}
          </div>
        </div>
      </div>
      {(imageUrl || description) && (
        <div className="px-4 pb-4">
          <div className="mt-2 flex items-center gap-2">
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={description || "Food image"} 
                className="rounded-lg h-16 w-16 object-cover"
              />
            )}
            {description && (
              <div className="text-sm text-gray-600">{description}</div>
            )}
          </div>
        </div>
      )}
      
      {analysisPending && (
        <div className="px-4 pb-3">
          <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-1 animate-pulse"></div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">AI is analyzing your meal...</p>
        </div>
      )}
    </div>
  );
}

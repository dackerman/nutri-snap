import { formatTimeFromDate } from "@/lib/utils";
import type { Meal } from "@shared/schema";

interface MealCardProps {
  meal: Meal;
}

export default function MealCard({ meal }: MealCardProps) {
  const { mealType, foodName, description, imageUrl, calories, fat, carbs, timestamp } = meal;
  
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
            {foodName && (
              <p className="text-sm font-medium text-gray-700">{foodName}</p>
            )}
            <p className="text-sm text-gray-500">{timeString}</p>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">{calories} kcal</div>
            <div className="text-xs text-gray-500">{fat}g fat · {carbs}g carbs</div>
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
    </div>
  );
}

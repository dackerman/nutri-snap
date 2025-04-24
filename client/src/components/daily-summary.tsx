import { calculateCalorieProgress } from "@/lib/utils";

// Export the interface for use in other components
export interface DailySummaryProps {
  calories: number;
  fat: number;
  carbs: number;
  protein?: number;
  goal?: number;
}

// Export summary data type for use in other components
export interface DailySummary {
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
}

export default function DailySummary({ 
  calories, 
  fat, 
  carbs, 
  protein = 0,
  goal = 2000 
}: DailySummaryProps) {
  // Calculate progress percentage
  const progressPercentage = calculateCalorieProgress(calories, goal);

  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Today's Summary</h2>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <div className="grid grid-cols-4 gap-3 mb-4">
          {/* Calories */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-dark">{calories}</div>
            <div className="text-sm text-gray-500">Calories</div>
          </div>
          
          {/* Fat */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-dark">{fat}g</div>
            <div className="text-sm text-gray-500">Fat</div>
          </div>
          
          {/* Carbs */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-dark">{carbs}g</div>
            <div className="text-sm text-gray-500">Carbs</div>
          </div>
          
          {/* Protein */}
          <div className="text-center">
            <div className="text-2xl font-semibold text-primary-dark">{protein}g</div>
            <div className="text-sm text-gray-500">Protein</div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </div>
        
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0 kcal</span>
          <span>{goal} kcal</span>
        </div>
      </div>
    </section>
  );
}

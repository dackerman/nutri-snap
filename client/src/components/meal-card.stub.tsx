import React from 'react';

interface Meal {
  id: number;
  mealType: string;
  foodName?: string;
  calories?: number;
  analysisPending?: boolean;
}

interface MealCardProps {
  meal: Meal;
  index: number;
}

// Simple stub component that mimics the meal-card component for testing
const MealCard: React.FC<MealCardProps> = ({ meal }) => {
  return (
    <div className="meal-card">
      <div className="meal-header">
        <div className="meal-type">{meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}</div>
      </div>
      <div className="meal-content">
        <div className="meal-name">{meal.foodName}</div>
        {meal.analysisPending ? (
          <div className="meal-pending">Analysis in progress...</div>
        ) : (
          <div className="meal-calories">{meal.calories}</div>
        )}
      </div>
    </div>
  );
};

export default MealCard;
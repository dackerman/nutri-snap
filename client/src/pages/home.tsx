import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import DailySummary from "@/components/daily-summary";
import MealCard from "@/components/meal-card";
import NavBar from "@/components/nav-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import type { Meal } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];

  // Fetch today's meals
  const { data: meals, isLoading: mealsLoading } = useQuery<Meal[]>({
    queryKey: ['/api/meals', dateString],
  });

  // Fetch nutritional summary
  const { data: summary, isLoading: summaryLoading } = useQuery<{calories: number, fat: number, carbs: number}>({
    queryKey: ['/api/summary', dateString],
  });

  const handleAddFood = () => {
    setLocation('/add');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="container px-4 py-3 mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <span className="material-icons text-primary mr-2">eco</span>
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
          />
        )}

        {/* Food Timeline */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Today's Meals</h2>
            <div className="text-sm text-gray-500">{formatDate(today)}</div>
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
              <p className="text-gray-500">No meals added today</p>
              <Button 
                onClick={handleAddFood}
                className="mt-4 bg-primary hover:bg-primary-dark"
              >
                Add Your First Meal
              </Button>
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

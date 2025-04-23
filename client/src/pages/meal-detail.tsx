import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { formatTimeFromDate, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Meal } from "@shared/schema";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function MealDetail() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  
  // Extract the meal ID from the URL
  const mealId = location.split('/').pop();
  
  // Fetch meal details
  const { data: meal, isLoading, error } = useQuery<Meal>({
    queryKey: [`/api/meals/${mealId}`],
    enabled: !!mealId,
    // Add refetch intervals to automatically update the view when analysis completes
    refetchInterval: (data) => {
      // If the meal exists and analysis is pending, refetch more frequently
      return data?.analysisPending ? 5000 : 60000;
    }
  });
  
  // Process images when meal data changes
  useEffect(() => {
    if (meal?.imageUrl) {
      try {
        // Attempt to parse as JSON
        const parsedImages = JSON.parse(meal.imageUrl);
        if (Array.isArray(parsedImages)) {
          setImages(parsedImages);
          return;
        }
      } catch (e) {
        // Not valid JSON, treat as single image
      }
      // If not JSON or parsing failed, treat as a single image
      setImages([meal.imageUrl]);
    }
  }, [meal]);

  // Handle going back
  const handleBack = () => {
    setLocation('/');
  };

  // Handle meal deletion
  const handleDelete = async () => {
    if (!meal || !confirm("Are you sure you want to delete this meal?")) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const res = await fetch(`/api/meals/${meal.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete meal");
      }
      
      // Show success toast
      toast({
        title: "Meal deleted",
        description: "Your meal has been successfully deleted",
      });
      
      // Invalidate queries and redirect to home
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      setLocation('/');
    } catch (error) {
      console.error("Error deleting meal:", error);
      toast({
        title: "Error",
        description: "Failed to delete the meal",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Skeleton className="h-64 w-full" />
          <div className="p-5 space-y-4">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center max-w-md">
          <div className="text-red-500 mb-2">
            <span className="material-icons text-4xl">error_outline</span>
          </div>
          <h2 className="text-lg font-medium mb-2">Meal not found</h2>
          <p className="text-gray-500 mb-4">The meal you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={handleBack}>Go back home</Button>
        </div>
      </div>
    );
  }

  // Format time for display
  const timeString = formatTimeFromDate(new Date(meal.timestamp));
  const dateString = formatDate(new Date(meal.timestamp));
  
  // Capitalize meal type
  const formattedMealType = meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-50 pb-16"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2" 
              onClick={handleBack}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold">{formattedMealType}</h1>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-500" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="w-full aspect-square bg-gray-200 relative">
            <img 
              src={images[currentImageIndex]} 
              alt={meal.foodName || "Food image"} 
              className="w-full h-full object-cover"
            />
            
            {/* Image navigation controls - only shown when multiple images */}
            {images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-2">
                <Button 
                  variant="secondary"
                  size="icon"
                  className="bg-white/80 backdrop-blur-sm rounded-full shadow-md"
                  onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <Button 
                  variant="secondary"
                  size="icon"
                  className="bg-white/80 backdrop-blur-sm rounded-full shadow-md"
                  onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          )}
          
          {/* Thumbnail navigation - only shown when multiple images */}
          {images.length > 1 && (
            <div className="flex justify-center mt-2 space-x-2 px-4">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Details */}
      <motion.div 
        className="container mx-auto px-4 py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-xl shadow-sm p-5">
          {/* Basic Info */}
          <div className="mb-4">
            {meal.foodName && (
              <h2 className="text-2xl font-semibold text-gray-800 mb-1">{meal.foodName}</h2>
            )}
            {meal.brandName && (
              <div className="text-base text-gray-600 mb-1">Brand: {meal.brandName}</div>
            )}
            {meal.quantity && meal.unit && (
              <div className="text-sm text-gray-600 mb-2">Serving size: {meal.quantity} {meal.unit}</div>
            )}
            <div className="flex items-center text-gray-500 mb-2">
              <span className="material-icons text-sm mr-1">schedule</span>
              <span className="text-sm">{timeString} · {dateString}</span>
            </div>
          </div>

          {/* Nutritional Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Nutritional Information</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-semibold text-gray-800">{meal.calories}</div>
                <div className="text-xs text-gray-500">calories</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-semibold text-gray-800">{meal.fat}g</div>
                <div className="text-xs text-gray-500">fat</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-semibold text-gray-800">{meal.carbs}g</div>
                <div className="text-xs text-gray-500">carbs</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-semibold text-gray-800">{meal.protein || 0}g</div>
                <div className="text-xs text-gray-500">protein</div>
              </div>
            </div>
          </div>

          {/* Description */}
          {meal.description && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Description</h3>
              <p className="text-gray-600">{meal.description}</p>
            </div>
          )}

          {/* Analysis Status */}
          {meal.analysisPending && (
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <div className="flex items-center text-blue-700 mb-2">
                <span className="material-icons mr-2">info</span>
                <h3 className="font-medium">Analysis in Progress</h3>
              </div>
              <p className="text-blue-600 text-sm mb-2">We're still analyzing this meal to provide the most accurate nutritional information.</p>
              <div className="w-full bg-blue-100 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  className="bg-blue-500 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
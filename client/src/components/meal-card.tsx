import { formatTimeFromDate } from "@/lib/utils";
import type { Meal } from "@shared/schema";
import { Loader2, Clock, Info, Camera, Zap, Utensils, ArrowRight, ArrowUpRight, Pencil, Flame, Drumstick } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useRef } from "react";
import { useLocation, Link } from "wouter";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

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
  
  // Process image URL
  const displayImageUrl = useMemo(() => {
    if (!imageUrl) return "";
    
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0]; // Return first image if it's an array
      }
    } catch {
      // If parsing fails, it's a single image URL
      return imageUrl;
    }
    
    return imageUrl;
  }, [imageUrl]);

  // Handle click to navigate to detail view
  const handleClick = () => {
    setLocation(`/meals/${id}`);
  };

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        delay: index * 0.05, // Staggered animation based on index
        when: "beforeChildren",
      }
    },
    hover: { 
      y: -5,
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.98 }
  };

  // Arrow animation when hovering card
  const arrowVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 0, x: -5 },
    hover: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.2 } 
    }
  };

  // Content animation for staggered children
  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  // Individual item animations
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  // Animation reference for when the card is hovered
  const cardRef = useRef<HTMLDivElement>(null);
  
  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm overflow-hidden relative"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      onClick={handleClick}
      ref={cardRef}
    >
      {/* Top highlight border with animation */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-dark to-primary"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ 
          delay: index * 0.05 + 0.2,
          duration: 0.5,
          ease: "easeOut"
        }}
      />

      <div className="p-4">
        <motion.div 
          className="flex justify-between items-start"
          variants={contentVariants}
        >
          <div>
            <motion.div 
              className="flex items-center"
              variants={itemVariants}
            >
              {mealType === 'breakfast' && (
                <motion.span className="text-yellow-500 mr-1" whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Utensils className="h-4 w-4" />
                </motion.span>
              )}
              {mealType === 'lunch' && (
                <motion.span className="text-green-500 mr-1" whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Utensils className="h-4 w-4" />
                </motion.span>
              )}
              {mealType === 'dinner' && (
                <motion.span className="text-blue-500 mr-1" whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Utensils className="h-4 w-4" />
                </motion.span>
              )}
              {mealType === 'snack' && (
                <motion.span className="text-purple-500 mr-1" whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Utensils className="h-4 w-4" />
                </motion.span>
              )}
              <h3 className="font-medium text-gray-800">{formattedMealType}</h3>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              {foodName ? (
                <div>
                  <motion.p 
                    className="text-sm font-medium text-gray-700 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {foodName}
                  </motion.p>
                  {brandName && (
                    <motion.p 
                      className="text-xs text-gray-500 flex items-center"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <span className="material-icons text-xs mr-1">business</span>
                      Brand: {brandName}
                    </motion.p>
                  )}
                  {quantity && unit && (
                    <motion.p 
                      className="text-xs text-gray-500 flex items-center"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <span className="material-icons text-xs mr-1">scale</span>
                      Serving: {quantity} {unit}
                    </motion.p>
                  )}
                </div>
              ) : analysisPending ? (
                <div className="flex items-center mt-1">
                  <motion.div
                    animate={{ 
                      rotate: [0, 180, 360],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="mr-1"
                  >
                    <Zap className="h-3 w-3 text-yellow-500" />
                  </motion.div>
                  <motion.p 
                    className="text-sm font-medium text-gray-500 italic"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Detecting food name...
                  </motion.p>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-500 italic mt-1">Unidentified food</p>
              )}
            </motion.div>
            
            <motion.p 
              className="text-xs text-gray-500 flex items-center mt-1"
              variants={itemVariants}
            >
              <Clock className="h-3 w-3 mr-1" />
              {timeString}
            </motion.p>
          </div>
          
          <motion.div 
            className="text-right"
            variants={itemVariants}
          >
            {analysisPending ? (
              <div className="flex items-center justify-end">
                <Loader2 className="h-4 w-4 animate-spin mr-1 text-primary" />
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
                <motion.div 
                  className="font-semibold text-gray-800"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: index * 0.05 + 0.3,
                    type: "spring", 
                    stiffness: 300, 
                    damping: 15 
                  }}
                >
                  {calories} kcal
                </motion.div>
                <motion.div 
                  className="text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.4 }}
                >
                  {fat}g fat · {carbs}g carbs · {protein || 0}g protein
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Image and description section with conditional expansion */}
      <AnimatePresence>
        {(displayImageUrl || description) && (
          <motion.div
            className="px-4 pb-4 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto",
              opacity: 1
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3">
              {displayImageUrl && (
                <motion.div
                  className="relative overflow-hidden rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div 
                    className="absolute inset-0 bg-primary opacity-0"
                    whileHover={{ opacity: 0.1 }}
                  />
                  <img 
                    src={displayImageUrl} 
                    alt={description || "Food image"} 
                    className="h-16 w-16 object-cover"
                  />
                </motion.div>
              )}
              {description && (
                <motion.div 
                  className="text-sm text-gray-600"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {description}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Animated progress indicator for pending analysis */}
      <AnimatePresence>
        {analysisPending && (
          <motion.div 
            className="px-4 pb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <motion.div 
                className="bg-gradient-to-r from-blue-400 via-primary to-blue-400 h-full"
                initial={{ x: "-100%" }}
                animate={{ 
                  x: ["-100%", "100%"]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear" 
                }}
              />
            </motion.div>
            <motion.div 
              className="flex items-center justify-center mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <span className="material-icons text-xs text-primary mr-1">smart_toy</span>
              </motion.span>
              <p className="text-xs text-gray-500">
                AI is analyzing your meal...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nutrition section with edit option */}
      <div className="px-4 pb-4">
        {/* Footer with nutrition summary and actions */}
        <motion.div 
          className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex space-x-2 text-xs">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center">
              <Flame className="h-3 w-3 mr-1" />
              {calories} cal
            </span>
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full flex items-center">
              <Drumstick className="h-3 w-3 mr-1" />
              {protein}g protein
            </span>
          </div>
          
          <div className="flex space-x-2">
            {/* Edit button with stop propagation to prevent card click */}
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to edit page
                setLocation(`/edit-meal/${id}`);
              }}
            >
              <Pencil className="h-4 w-4 text-gray-500 hover:text-primary transition-colors" />
            </Button>
            
            {/* Nutrition details */}
            <HoverCard>
              <HoverCardTrigger>
                <Info className="h-4 w-4 text-gray-400 cursor-pointer hover:text-primary transition-colors" />
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-3">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Calories</span>
                  <span className="text-sm font-medium">{calories} cal</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Fat</span>
                  <span className="text-sm font-medium">{fat}g</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Carbs</span>
                  <span className="text-sm font-medium">{carbs}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Protein</span>
                  <span className="text-sm font-medium">{protein}g</span>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </motion.div>
      </div>
      
      {/* Clickable indicator */}
      <motion.div 
        className="absolute bottom-2 right-2 text-primary"
        variants={arrowVariants}
      >
        <ArrowUpRight className="h-4 w-4" />
      </motion.div>
    </motion.div>
  );
}

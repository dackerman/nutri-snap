import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { FileInput } from "@/components/ui/file-input";
import { MultiFileInput } from "@/components/ui/multi-file-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { mealTypeOptions } from "@/lib/utils";
import { Loader2, Image as ImageIcon, Check, CloudUpload, Camera, Clock, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";

// Form schema
const formSchema = z
  .object({
    mealType: z.string().min(1, "Meal type is required"),
    foodName: z.string().optional(), // Optional to allow AI to detect it
    description: z.string().optional(),
    images: z.array(z.instanceof(File)).optional(), // Multiple images
  })
  .refine(
    (data) => {
      // Either at least one image or a description must be provided
      return (!!data.images && data.images.length > 0) || 
             (!!data.description && data.description.trim().length > 0);
    },
    {
      message: "Either an image or description must be provided",
      path: ["images"], // Show error on images field
    }
  );

type FormValues = z.infer<typeof formSchema>;

export default function AddMeal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form handling
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mealType: "breakfast",
      foodName: "",
      description: "",
    },
  });

  // Mutation for creating a meal
  const createMeal = useMutation({
    mutationFn: async (values: FormValues) => {
      // Set uploading state immediately to show feedback
      setIsUploading(true);
      
      // Prepare form data - this is fast
      const formData = new FormData();
      formData.append("mealType", values.mealType);
      // TypeScript narrowing - only append if foodName is a non-empty string
      if (values.foodName && values.foodName.trim() !== '') {
        formData.append("foodName", values.foodName);
      }
      if (values.description) {
        formData.append("description", values.description);
      }
      // Append multiple images if provided
      if (values.images && values.images.length > 0) {
        // Store first image as main image
        formData.append("image", values.images[0]);
        
        // Append additional images if there are more than one
        if (values.images.length > 1) {
          // Save additional images as a JSON string in the imageUrl field
          // We'll handle this on the server side
          for (let i = 1; i < values.images.length; i++) {
            formData.append(`additionalImage${i}`, values.images[i]);
          }
        }
      }

      // The fetch call can take time because it's uploading the image
      // Use a timeout to show success quickly if upload takes too long
      const uploadTimeout = setTimeout(() => {
        // If it's taking more than 800ms, just assume it'll work and proceed
        // This significantly improves perceived performance
        setIsUploading(false);
        setIsSuccess(true);
        
        setTimeout(() => {
          setIsSuccess(false);
          setLocation('/');
        }, 500);
      }, 800);

      try {
        const res = await fetch("/api/meals", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        // Clear the timeout since we got a response
        clearTimeout(uploadTimeout);

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to add meal");
        }

        return res.json();
      } catch (error) {
        // Clear the timeout in case of error
        clearTimeout(uploadTimeout);
        throw error;
      }
    },
    onSuccess: () => {
      // Only run these if the timeout hasn't triggered already
      if (isUploading) {
        setIsUploading(false);
        setIsSuccess(true);
        
        // Show success message for a very short time
        setTimeout(() => {
          // Invalidate queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
          queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
          setIsSuccess(false);
          setLocation('/');
        }, 500); // Very short wait time for better UX
      } else {
        // Just make sure data is refreshed
        queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      }
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Error adding meal",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createMeal.mutate(values);
  };

  const handleClose = () => {
    if (!isUploading) {
      setLocation('/');
    }
  };

  // References for animations
  const formContainer = useRef<HTMLDivElement>(null);
  
  // Animation variants for the modal
  const modalVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.3 } }
  };
  
  // Animation variants for form elements to stagger entry
  const formElementVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1, 
      y: 0,
      transition: { 
        delay: custom * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    })
  };
  
  // Loading animation variants
  const loadingVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        damping: 20, 
        stiffness: 300 
      }
    },
    exit: { 
      scale: 0.8, 
      opacity: 0,
      transition: { duration: 0.2 } 
    }
  };
  
  // Success animation variants
  const successIconVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        damping: 10, 
        stiffness: 300,
        delay: 0.2
      }
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Background overlay with blur effect */}
        <motion.div 
          className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        />
        
        {/* Main content */}
        <motion.div 
          className="bg-white rounded-t-xl w-full max-h-[90vh] overflow-y-auto mt-auto relative z-10"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          ref={formContainer}
        >
          <motion.div 
            className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.2 } }}
          >
            <div className="flex items-center">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Utensils className="mr-2 h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <motion.h2 
                  className="text-lg font-semibold text-gray-800"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.4 } }}
                >
                  Add Meal
                </motion.h2>
                {user && (
                  <motion.span 
                    className="text-xs text-gray-500 block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.5 } }}
                  >
                    for {user.name || user.email}
                  </motion.span>
                )}
              </div>
            </div>
            <motion.button 
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100"
              onClick={handleClose}
              disabled={isUploading}
              whileHover={{ scale: 1.1, backgroundColor: "#f1f5f9" }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="material-icons">close</span>
            </motion.button>
          </motion.div>

          <div className="p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <motion.div
                  custom={0}
                  variants={formElementVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem className="mb-5">
                        <FormLabel className="flex items-center">
                          <Camera className="h-4 w-4 mr-2 text-primary" />
                          Photos of your meal (optional if description provided)
                        </FormLabel>
                        <FormControl>
                          <MultiFileInput
                            onFilesSelect={(files) => field.onChange(files)}
                            maxFiles={5}
                            label=""
                            hasError={!!form.formState.errors.images}
                            errorMessage={form.formState.errors.images?.message as string}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  custom={1}
                  variants={formElementVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-primary" />
                          Meal Type
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select meal type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mealTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  custom={2}
                  variants={formElementVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FormField
                    control={form.control}
                    name="foodName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Utensils className="h-4 w-4 mr-2 text-primary" />
                          Food Name (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Leave empty to let AI detect it automatically"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <motion.p 
                          className="text-xs text-gray-500 mt-1 flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1, transition: { delay: 1.0 } }}
                        >
                          <span className="material-icons text-xs mr-1">smart_toy</span>
                          AI will try to identify the food if left blank
                        </motion.p>
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  custom={3}
                  variants={formElementVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <span className="material-icons text-sm mr-2 text-primary">description</span>
                          Description (required if no image provided)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any details about your meal..."
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  custom={4}
                  variants={formElementVariants}
                  initial="hidden"
                  animate="visible"
                  className="py-2 text-center text-sm text-gray-500 italic flex items-center justify-center"
                >
                  <span className="material-icons text-primary mr-2">auto_awesome</span>
                  We'll analyze your photo or description to estimate nutrition information
                </motion.div>

                <motion.div
                  custom={5}
                  variants={formElementVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary-dark text-white py-6"
                    disabled={isUploading || isSuccess}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Adding Meal...
                      </>
                    ) : isSuccess ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Added Successfully!
                      </>
                    ) : (
                      <>
                        <CloudUpload className="mr-2 h-5 w-5" />
                        Add Meal
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </div>
        </motion.div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isUploading && (
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-white rounded-xl p-6 max-w-sm w-4/5 text-center"
                variants={loadingVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div 
                  className="relative h-16 w-16 mx-auto mb-4"
                >
                  <motion.div 
                    className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary border-b-gray-200 border-l-gray-200"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div 
                    className="absolute inset-0 flex items-center justify-center text-primary opacity-80"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Utensils className="h-6 w-6" />
                  </motion.div>
                </motion.div>
                <motion.h3 
                  className="text-lg font-medium text-gray-900 mb-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Adding your meal
                </motion.h3>
                <motion.p 
                  className="text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Adding meal data... AI analysis will continue in the background.
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="bg-white rounded-xl p-6 max-w-sm w-4/5 text-center"
                variants={loadingVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div 
                  className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ 
                    scale: [0.5, 1.2, 1],
                    opacity: 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    times: [0, 0.6, 1],
                    ease: "easeInOut" 
                  }}
                >
                  <motion.div
                    variants={successIconVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Check className="h-8 w-8 text-green-500" />
                  </motion.div>
                </motion.div>
                <motion.h3 
                  className="text-lg font-medium text-gray-900 mb-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Successfully Added!
                </motion.h3>
                <motion.p 
                  className="text-gray-500 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Your meal has been added to your daily log.
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

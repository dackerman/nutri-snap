import { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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

// Form schema - same as add meal for consistency
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

export default function EditMeal() {
  const [match, params] = useRoute("/edit-meal/:id");
  const mealId = params?.id;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageModified, setImageModified] = useState(false);

  // Fetch the meal details
  const { data: meal, isLoading } = useQuery({
    queryKey: ['/api/meals', mealId],
    queryFn: async () => {
      const res = await fetch(`/api/meals/${mealId}`);
      if (!res.ok) {
        throw new Error("Failed to load meal");
      }
      return res.json();
    },
    enabled: !!mealId,
  });

  // Form handling
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mealType: "breakfast",
      foodName: "",
      description: "",
    },
  });

  // Update form when meal data is loaded
  useEffect(() => {
    if (meal) {
      form.reset({
        mealType: meal.mealType,
        foodName: meal.foodName || "",
        description: meal.description || "",
      });
      
      // Store the existing image URL for preview
      setExistingImageUrl(meal.imageUrl);
    }
  }, [meal, form]);

  // Mutation for updating a meal
  const updateMeal = useMutation({
    mutationFn: async (values: FormValues) => {
      // Set uploading state immediately to show feedback
      setIsUploading(true);
      
      // Determine if we need to upload a new image
      const needsImageUpload = imageModified && values.images && values.images.length > 0;
      
      if (needsImageUpload) {
        // Handle image upload - use FormData for images
        const formData = new FormData();
        formData.append("mealType", values.mealType);
        if (values.foodName) {
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
            for (let i = 1; i < values.images.length; i++) {
              formData.append(`additionalImage${i}`, values.images[i]);
            }
          }
        }
        
        // The fetch call can take time because it's uploading the image
        const uploadTimeout = setTimeout(() => {
          // If it's taking more than 800ms, just assume it'll work and proceed
          setIsUploading(false);
          setIsSuccess(true);
          
          setTimeout(() => {
            setIsSuccess(false);
            setLocation('/');
          }, 500);
        }, 800);
        
        try {
          const res = await fetch(`/api/meals/${mealId}`, {
            method: "PATCH",
            body: formData,
            credentials: "include",
          });
          
          // Clear the timeout since we got a response
          clearTimeout(uploadTimeout);
          
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Failed to update meal");
          }
          
          return res.json();
        } catch (error) {
          // Clear the timeout in case of error
          clearTimeout(uploadTimeout);
          throw error;
        }
      } else {
        // No new image, just update text fields with JSON
        try {
          const updateData = {
            mealType: values.mealType,
            foodName: values.foodName || null,
            description: values.description || null,
          };
          
          const res = await apiRequest("PATCH", `/api/meals/${mealId}`, updateData);
          
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Failed to update meal");
          }
          
          return res.json();
        } catch (error) {
          throw error;
        } finally {
          setIsUploading(false);
        }
      }
    },
    onSuccess: () => {
      setIsSuccess(true);
      
      // Show success message for a very short time
      setTimeout(() => {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/meals', mealId] });
        setIsSuccess(false);
        setLocation('/');
      }, 500); // Very short wait time for better UX
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Error updating meal",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMeal.mutate(values);
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
  
  if (!match) {
    return null; // Don't render if not on the edit meal route
  }
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
        <motion.div 
          className="bg-white p-8 rounded-xl shadow-lg flex items-center"
          variants={loadingVariants}
          initial="hidden"
          animate="visible"
        >
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
          <span>Loading meal data...</span>
        </motion.div>
      </div>
    );
  }
  
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
                  Edit Meal
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
                            onFilesSelect={(files) => {
                              field.onChange(files);
                              setImageModified(true);
                            }}
                            maxFiles={5}
                            label=""
                            previews={existingImageUrl && !imageModified ? 
                              // Handle both single image and array
                              (existingImageUrl.startsWith('[') 
                                ? JSON.parse(existingImageUrl) 
                                : [existingImageUrl]) 
                              : null}
                            hasError={!!form.formState.errors.images}
                            errorMessage={form.formState.errors.images?.message as string}
                          />
                        </FormControl>
                        {meal && meal.userProvidedImage === false && (
                          <motion.div 
                            className="text-xs text-gray-500 mt-1 flex items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                          >
                            <span className="material-icons text-xs mr-1">auto_awesome</span>
                            This image was AI-generated from your description
                          </motion.div>
                        )}
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
                          value={field.value}
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
                            value={field.value || ""}
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
                            rows={3}
                            {...field}
                            value={field.value || ""}
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
                  className="flex pt-2"
                >
                  <div className="flex-1 flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1"
                      onClick={handleClose}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 gap-2" 
                      disabled={isUploading || isSuccess}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="h-4 w-4" />
                          Updated!
                        </>
                      ) : (
                        <>
                          <CloudUpload className="h-4 w-4" />
                          Update Meal
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </form>
            </Form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
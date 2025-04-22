import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { FileInput } from "@/components/ui/file-input";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Form schema
const formSchema = z.object({
  mealType: z.string().min(1, "Meal type is required"),
  foodName: z.string().min(2, "Food name is required"),
  description: z.string().optional(),
  image: z.instanceof(File, { message: "Food image is required" }),
});

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
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append("mealType", values.mealType);
      formData.append("foodName", values.foodName);
      if (values.description) {
        formData.append("description", values.description);
      }
      formData.append("image", values.image);

      const res = await fetch("/api/meals", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to add meal");
      }

      return res.json();
    },
    onSuccess: () => {
      setIsUploading(false);
      setIsSuccess(true);
      
      // Show success message for 2 seconds
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
        setIsSuccess(false);
        setLocation('/');
      }, 2000);
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

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex flex-col">
      <div className="bg-white rounded-t-xl w-full max-h-[90vh] overflow-y-auto mt-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-800">Add Meal</h2>
            {user && (
              <span className="ml-2 text-sm text-gray-500">
                for {user.name || user.email}
              </span>
            )}
          </div>
          <button 
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100"
            onClick={handleClose}
            disabled={isUploading}
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem className="mb-5">
                    <FormLabel>Photo of your meal</FormLabel>
                    <FormControl>
                      <FileInput
                        onFileSelect={(file) => field.onChange(file)}
                        label=""
                        hasError={!!form.formState.errors.image}
                        errorMessage={form.formState.errors.image?.message as string}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Type</FormLabel>
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

              <FormField
                control={form.control}
                name="foodName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Food Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter the name of the food"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
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

              <div className="py-2 text-center text-sm text-gray-500 italic">
                We'll analyze your photo to estimate nutrition information
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white py-6"
                disabled={isUploading || isSuccess}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : isSuccess ? (
                  <>
                    <span className="material-icons mr-2">check</span>
                    Added Successfully!
                  </>
                ) : (
                  "Add Meal"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-4/5 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Analyzing your meal</h3>
            <p className="text-gray-500">Using AI to calculate nutrition information...</p>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {isSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm w-4/5 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-green-500">check</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Successfully Added!</h3>
            <p className="text-gray-500 mb-4">Your meal has been added to your daily log.</p>
          </div>
        </div>
      )}
    </div>
  );
}

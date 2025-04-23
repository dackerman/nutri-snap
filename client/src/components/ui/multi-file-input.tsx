import * as React from "react";
import { cn } from "@/lib/utils";
import { X, Camera, Upload, Image as ImageIcon, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface MultiFileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onFilesSelect?: (files: File[]) => void;
  label?: string;
  previews?: string[] | null;
  previewAlt?: string;
  hasError?: boolean;
  errorMessage?: string;
  maxFiles?: number;
}

const MultiFileInput = React.forwardRef<HTMLInputElement, MultiFileInputProps>(
  (
    {
      className,
      onFilesSelect,
      label,
      previews = [],
      previewAlt = "Preview",
      hasError,
      errorMessage,
      maxFiles = 5,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [previewUrls, setPreviewUrls] = React.useState<string[]>(previews || []);
    const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

    React.useEffect(() => {
      if (previews && previews.length > 0) {
        setPreviewUrls(previews);
      }
    }, [previews]);

    const handleClick = () => {
      if (previewUrls.length >= maxFiles) {
        return;
      }
      inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const newFiles: File[] = [];
        const newPreviewUrls: string[] = [...previewUrls];
        
        // Add new files up to the max limit
        for (let i = 0; i < files.length; i++) {
          if (previewUrls.length + newPreviewUrls.length - previewUrls.length >= maxFiles) {
            break;
          }
          
          const file = files[i];
          newFiles.push(file);
          
          // Create a preview URL
          const reader = new FileReader();
          reader.onload = (event) => {
            newPreviewUrls.push(event.target?.result as string);
            // Only update state if we've processed all files
            if (newPreviewUrls.length === previewUrls.length + newFiles.length) {
              setPreviewUrls(newPreviewUrls);
              const updatedFiles = [...selectedFiles, ...newFiles];
              setSelectedFiles(updatedFiles);
              
              if (onFilesSelect) {
                onFilesSelect(updatedFiles);
              }
            }
          };
          reader.readAsDataURL(file);
        }
        
        // Reset the file input so the same files can be selected again if removed
        e.target.value = '';
      }
    };

    const removeImage = (index: number) => {
      const newPreviewUrls = [...previewUrls];
      newPreviewUrls.splice(index, 1);
      setPreviewUrls(newPreviewUrls);
      
      const newFiles = [...selectedFiles];
      newFiles.splice(index, 1);
      setSelectedFiles(newFiles);
      
      if (onFilesSelect) {
        onFilesSelect(newFiles);
      }
    };

    const borderClass = hasError
      ? "border-red-500"
      : "border-gray-300 hover:border-gray-400";

    return (
      <div className={className}>
        {label && (
          <label className="block text-gray-700 text-sm font-medium mb-2">
            {label}
          </label>
        )}
        
        {/* Preview grid for uploaded images */}
        <AnimatePresence>
          {previewUrls.length > 0 && (
            <motion.div 
              className="grid grid-cols-3 gap-2 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {previewUrls.map((url, index) => (
                <motion.div 
                  key={`${url}-${index}`} 
                  className="relative group overflow-hidden"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    type: "spring",
                    duration: 0.5,
                    delay: index * 0.05, 
                    stiffness: 200, 
                    damping: 20 
                  }}
                  whileHover={{ scale: 1.05 }}
                  layout
                >
                  <motion.img
                    src={url}
                    alt={`${previewAlt} ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    initial={{ filter: "blur(10px)" }}
                    animate={{ filter: "blur(0px)" }}
                    transition={{ duration: 0.5 }}
                  />
                  <motion.div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg"
                  />
                  <motion.button
                    type="button"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ delay: index * 0.05 + 0.2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Upload area */}
        <AnimatePresence>
          {previewUrls.length < maxFiles && (
            <motion.div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                borderClass,
                "hover:bg-gray-50"
              )}
              onClick={handleClick}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              whileHover={{ 
                scale: 1.02, 
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                borderColor: "#60a5fa"
              }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div 
                className="py-4 flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="relative mb-2"
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-primary rounded-full opacity-10"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ 
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  />
                  <Camera className="text-primary h-8 w-8" />
                </motion.div>
                <motion.p 
                  className="text-gray-600 text-sm font-medium"
                  animate={{ 
                    y: [0, -2, 0],
                  }}
                  transition={{ 
                    repeat: Infinity,
                    duration: 2,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                >
                  {previewUrls.length === 0 
                    ? `Tap to upload photos (max ${maxFiles})`
                    : `Add more photos (${previewUrls.length}/${maxFiles})`
                  }
                </motion.p>
                {previewUrls.length === 0 && (
                  <motion.div 
                    className="flex items-center mt-2 text-xs text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />
                    <span>AI will analyze your photos</span>
                  </motion.div>
                )}
              </motion.div>
              <input
                type="file"
                multiple
                ref={inputRef}
                className="hidden"
                onChange={handleChange}
                accept="image/*"
                {...props}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {hasError && errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    );
  }
);

MultiFileInput.displayName = "MultiFileInput";

export { MultiFileInput };
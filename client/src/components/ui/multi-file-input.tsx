import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`${previewAlt} ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload area */}
        {previewUrls.length < maxFiles && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
              borderClass,
              "hover:bg-gray-50"
            )}
            onClick={handleClick}
          >
            <div className="py-4">
              <span className="material-icons text-gray-400 text-2xl mb-1">photo_camera</span>
              <p className="text-gray-500 text-sm">
                {previewUrls.length === 0 
                  ? `Tap to upload photos (max ${maxFiles})`
                  : `Add more photos (${previewUrls.length}/${maxFiles})`
                }
              </p>
            </div>
            <input
              type="file"
              multiple
              ref={inputRef}
              className="hidden"
              onChange={handleChange}
              accept="image/*"
              {...props}
            />
          </div>
        )}
        
        {hasError && errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    );
  }
);

MultiFileInput.displayName = "MultiFileInput";

export { MultiFileInput };
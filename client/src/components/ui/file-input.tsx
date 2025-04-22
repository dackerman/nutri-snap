import * as React from "react";
import { cn } from "@/lib/utils";

export interface FileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileSelect?: (file: File) => void;
  label?: string;
  preview?: string | null;
  previewAlt?: string;
  hasError?: boolean;
  errorMessage?: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      className,
      onFileSelect,
      label,
      preview,
      previewAlt = "Preview",
      hasError,
      errorMessage,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(preview || null);

    React.useEffect(() => {
      setPreviewUrl(preview || null);
    }, [preview]);

    const handleClick = () => {
      inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        
        if (onFileSelect) {
          onFileSelect(file);
        }
        
        // Create a preview URL
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);
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
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            borderClass,
            previewUrl ? "bg-white" : "hover:bg-gray-50"
          )}
          onClick={handleClick}
        >
          {!previewUrl ? (
            <div className="py-8">
              <span className="material-icons text-gray-400 text-3xl mb-2">photo_camera</span>
              <p className="text-gray-500">Tap to upload photo</p>
            </div>
          ) : (
            <div>
              <img
                src={previewUrl}
                alt={previewAlt}
                className="max-h-48 mx-auto rounded-lg"
              />
              <button type="button" className="mt-2 text-sm text-primary">
                Change photo
              </button>
            </div>
          )}
          <input
            type="file"
            ref={(node) => {
              // Handle both refs
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
              inputRef.current = node;
            }}
            className="hidden"
            onChange={handleChange}
            accept="image/*"
            {...props}
          />
        </div>
        {hasError && errorMessage && (
          <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
        )}
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };

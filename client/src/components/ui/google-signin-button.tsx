import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";

interface GoogleSignInButtonProps {
  onClick?: () => void;
  className?: string;
  isRedirect?: boolean;
  label?: string;
}

export function GoogleSignInButton({
  onClick,
  className = "",
  isRedirect = true,
  label = "Sign in with Google"
}: GoogleSignInButtonProps) {
  
  // If it's a redirect button, it links directly to the Google auth endpoint
  if (isRedirect) {
    return (
      <a 
        href="/api/auth/google" 
        className={`inline-block w-full ${className}`}
      >
        <Button
          variant="outline"
          type="button"
          className="w-full flex items-center justify-center gap-2 shadow-sm"
        >
          <FcGoogle className="h-5 w-5" />
          {label}
        </Button>
      </a>
    );
  }
  
  // If it's a button with a custom onClick handler
  return (
    <Button
      variant="outline"
      type="button"
      className={`w-full flex items-center justify-center gap-2 shadow-sm ${className}`}
      onClick={onClick}
    >
      <FcGoogle className="h-5 w-5" />
      {label}
    </Button>
  );
}
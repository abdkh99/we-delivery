export default function LoadingSpinner({
  className = "h-8",
  size = "large",
  color = "blue",
}: {
  className?: string;
  size?: "small" | "medium" | "large";
  color?: "blue" | "white" | "green";
}) {
  const spinnerSize =
    size === "small" ? "w-5 h-5" : size === "medium" ? "w-8 h-8" : "w-12 h-12";
  
  const borderColor = 
    color === "white" 
      ? "border-white/20 border-t-white" 
      : color === "green"
      ? "border-green-100 border-t-green-600"
      : "border-blue-100 border-t-blue-600";

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div className={`${spinnerSize} border-4 ${borderColor} rounded-full animate-spin`}></div>
        <div className={`absolute inset-0 ${spinnerSize} border-4 border-transparent ${
          color === "white" 
            ? "border-r-white/40" 
            : color === "green"
            ? "border-r-green-400"
            : "border-r-blue-400"
        } rounded-full animate-spin-slow`}></div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}

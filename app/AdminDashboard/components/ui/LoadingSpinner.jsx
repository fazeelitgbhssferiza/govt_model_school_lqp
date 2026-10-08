export default function LoadingSpinner({ size = 'md' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} animate-spin rounded-full border-4 border-gray-200 border-t-blue-600`} />
    </div>
  );
}
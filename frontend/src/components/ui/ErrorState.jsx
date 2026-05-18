export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Something went wrong</p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4 max-w-xs">{message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}

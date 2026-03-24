export function Separator({ className = "" }: { className?: string }) {
  return <div className={`sep ${className}`.trim()} />;
}

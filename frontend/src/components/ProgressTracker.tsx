import { Check, User, FileText, Briefcase, FolderOpen, Upload, CheckSquare } from 'lucide-react';

interface ProgressTrackerProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ProgressTracker({ currentStep, onStepClick }: ProgressTrackerProps) {
  const steps = [
    { number: 1, label: 'Personal Information', icon: User, color: 'bg-blue-500' },
    { number: 2, label: 'Personal Statement', icon: FileText, color: 'bg-red-500' },
    { number: 3, label: 'Resume / CV', icon: Briefcase, color: 'bg-gray-500' },
    { number: 4, label: 'Portfolio', icon: FolderOpen, color: 'bg-purple-500' },
    { number: 5, label: 'Other Uploads', icon: Upload, color: 'bg-orange-500' },
    { number: 6, label: 'Review & Submit', icon: CheckSquare, color: 'bg-green-500' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isClickable = step.number <= currentStep;

          return (
            <div key={step.number} className="relative">
              <button
                onClick={() => isClickable && onStepClick?.(step.number)}
                disabled={!isClickable}
                className={`w-full flex flex-col items-center gap-3 p-4 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#1A3175]/5 border-2 border-[#1A3175]'
                    : isCompleted
                    ? 'bg-green-50 border-2 border-green-200 cursor-pointer hover:bg-green-100'
                    : 'bg-gray-50 border-2 border-gray-200 opacity-60'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? step.color + ' text-white'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                
                <div className="text-center">
                  <div
                    className={`transition-colors ${
                      isActive ? 'text-[#1A3175]' : isCompleted ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
              </button>

              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gray-200 -z-10">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? 'bg-green-600 w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

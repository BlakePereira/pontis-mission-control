interface FunnelStep {
  step: string;
  started: number;
  completed: number;
  conversionRate: number;
  dropOff: number;
  dropOffRate: number;
}

interface SetupFunnelProps {
  data: FunnelStep[];
  formatStepName: (step: string) => string;
}

export default function SetupFunnel({ data, formatStepName }: SetupFunnelProps) {
  const getBarColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const shouldFlagDropOff = (dropOffRate: number) => dropOffRate > 15;

  return (
    <div className="space-y-6">
      {data.map((step, index) => (
        <div key={step.step} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Step {index + 1}: {formatStepName(step.step)}
              </span>
              {shouldFlagDropOff(step.dropOffRate) && (
                <span className="text-yellow-500">⚠️</span>
              )}
            </div>
            <div className="text-sm text-[#888]">
              {step.started} started → {step.completed} completed
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-[#0a0a0a] rounded-full h-6 overflow-hidden">
            <div
              className={`${getBarColor(step.conversionRate)} h-full flex items-center justify-end pr-3 text-xs font-bold text-white transition-all`}
              style={{ width: `${step.conversionRate}%` }}
            >
              {step.conversionRate > 10 && `${step.conversionRate.toFixed(1)}%`}
            </div>
          </div>

          {/* Drop-off Warning */}
          {shouldFlagDropOff(step.dropOffRate) && (
            <div className="text-sm text-yellow-500">
              ⚠️ DROP-OFF: {step.dropOff} users ({step.dropOffRate.toFixed(1)}%)
            </div>
          )}

          {/* Low Conversion Warning */}
          {step.conversionRate < 30 && step.step === "flowers" && (
            <div className="text-sm text-yellow-500">⚠️ LOW CONVERSION</div>
          )}
          {step.conversionRate < 20 && step.step === "cleaning" && (
            <div className="text-sm text-red-500">⚠️ VERY LOW CONVERSION</div>
          )}
        </div>
      ))}

      {/* Overall Completion */}
      {data.length > 0 && (
        <div className="pt-4 border-t border-[#2a2a2a]">
          <div className="text-sm font-medium">
            Completion: {data[0]?.started > 0 ? ((data.filter(s => s.step === 'basics').length > 0 ? data.filter(s => s.step === 'basics')[0].completed : 0) / data[0].started * 100).toFixed(1) : 0}% overall
          </div>
        </div>
      )}
    </div>
  );
}

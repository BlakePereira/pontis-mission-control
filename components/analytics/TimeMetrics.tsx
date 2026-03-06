interface TimeMetricsProps {
  metrics: {
    median: number;
    fastest: number;
    slowest: number;
    avgStepTimes: { step: string; avgSeconds: number }[];
  };
  formatTime: (seconds: number) => string;
  formatStepName: (step: string) => string;
}

export default function TimeMetrics({ metrics, formatTime, formatStepName }: TimeMetricsProps) {
  const getSlowestStep = () => {
    if (metrics.avgStepTimes.length === 0) return null;
    return metrics.avgStepTimes.reduce((max, current) =>
      current.avgSeconds > max.avgSeconds ? current : max
    );
  };

  const slowestStep = getSlowestStep();

  const getTimeColor = (seconds: number) => {
    if (seconds < 120) return "text-green-500"; // < 2 min
    if (seconds < 300) return "text-yellow-500"; // 2-5 min
    return "text-red-500"; // > 5 min
  };

  return (
    <div className="space-y-6">
      {/* Overall Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-[#888] mb-1">Median Time to Complete</div>
          <div className="text-2xl font-bold">{formatTime(metrics.median)}</div>
        </div>
        <div>
          <div className="text-sm text-[#888] mb-1">Fastest Completion</div>
          <div className="text-2xl font-bold text-green-500">{formatTime(metrics.fastest)}</div>
        </div>
        <div>
          <div className="text-sm text-[#888] mb-1">Slowest Completion</div>
          <div className="text-2xl font-bold text-red-500">{formatTime(metrics.slowest)}</div>
        </div>
      </div>

      {/* Avg Time Per Step */}
      <div className="pt-4 border-t border-[#2a2a2a]">
        <div className="text-lg font-semibold mb-4">Avg Time Per Step</div>
        <div className="space-y-3">
          {metrics.avgStepTimes
            .sort((a, b) => b.avgSeconds - a.avgSeconds)
            .map((step) => (
              <div key={step.step} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {formatStepName(step.step)}
                  </span>
                  {slowestStep && slowestStep.step === step.step && step.avgSeconds > 180 && (
                    <span className="text-red-500 text-xs">⚠️ SLOWEST</span>
                  )}
                </div>
                <div className={`text-sm font-mono ${getTimeColor(step.avgSeconds)}`}>
                  {formatTime(step.avgSeconds)}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Warnings */}
      {metrics.median > 600 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-sm text-red-400">
          ⚠️ Setup takes &gt;10min on average - consider simplifying the flow
        </div>
      )}
    </div>
  );
}

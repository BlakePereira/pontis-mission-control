interface FunnelStep {
  step: string;
  started: number;
  completed: number;
  conversionRate: number;
  dropOff: number;
  dropOffRate: number;
}

interface TimeMetrics {
  median: number;
  fastest: number;
  slowest: number;
  avgStepTimes: { step: string; avgSeconds: number }[];
}

interface OverviewMetrics {
  started: number;
  completed: number;
  completionRate: number;
  flowers: number;
  flowerRate: number;
  cleaning: number;
  cleaningRate: number;
}

interface ConversionInsightsProps {
  funnelData: FunnelStep[];
  timeMetrics: TimeMetrics | null;
  overview: OverviewMetrics;
  formatStepName: (step: string) => string;
}

export default function ConversionInsights({
  funnelData,
  timeMetrics,
  overview,
  formatStepName,
}: ConversionInsightsProps) {
  const generateInsights = () => {
    const wins: string[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Analyze funnel steps
    funnelData.forEach((step) => {
      if (step.conversionRate > 85) {
        wins.push(
          `${formatStepName(step.step)} has strong completion (${step.conversionRate.toFixed(1)}%) - good UX`
        );
      }

      if (step.dropOffRate > 15) {
        issues.push(
          `${formatStepName(step.step)} has high drop-off (${step.dropOffRate.toFixed(1)}%) - consider simplifying`
        );
        recommendations.push(`Simplify ${formatStepName(step.step)} step to reduce friction`);
      }
    });

    // Analyze subscription conversion
    if (overview.flowerRate < 30) {
      issues.push(
        `Flower conversion is low (${overview.flowerRate.toFixed(1)}%) - pricing or messaging issue?`
      );
      recommendations.push("A/B test flower pricing ($40/mo vs $30/mo)");
    }

    if (overview.cleaningRate < 20) {
      issues.push(
        `Cleaning conversion is very low (${overview.cleaningRate.toFixed(1)}%) - value unclear?`
      );
      recommendations.push("Add visual explainer video for cleaning service");
    }

    // Analyze time metrics
    if (timeMetrics) {
      if (timeMetrics.median > 600) {
        issues.push(
          `Setup takes ${Math.floor(timeMetrics.median / 60)} minutes on average - too long for mobile users`
        );
        recommendations.push("Reduce overall setup time to under 5 minutes");
      }

      const slowestStep = timeMetrics.avgStepTimes.reduce((max, current) =>
        current.avgSeconds > max.avgSeconds ? current : max
      );

      if (slowestStep.avgSeconds > 300) {
        issues.push(
          `${formatStepName(slowestStep.step)} is slow (${Math.floor(slowestStep.avgSeconds / 60)} min avg) - reduce friction`
        );
        recommendations.push(`Optimize ${formatStepName(slowestStep.step)} step for faster completion`);
      }
    }

    return { wins, issues, recommendations };
  };

  const insights = generateInsights();

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">🎯 Conversion Insights</h2>

      <div className="space-y-6">
        {/* Wins */}
        {insights.wins.length > 0 && (
          <div>
            <div className="text-green-500 font-semibold mb-2">✅ Good:</div>
            <ul className="space-y-1 text-sm text-[#ccc]">
              {insights.wins.slice(0, 3).map((win, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues */}
        {insights.issues.length > 0 && (
          <div>
            <div className="text-yellow-500 font-semibold mb-2">⚠️ Needs Work:</div>
            <ul className="space-y-1 text-sm text-[#ccc]">
              {insights.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div>
            <div className="text-blue-500 font-semibold mb-2">💡 Recommendations:</div>
            <ol className="space-y-1 text-sm text-[#ccc]">
              {insights.recommendations.slice(0, 5).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 font-semibold">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* No insights */}
        {insights.wins.length === 0 &&
          insights.issues.length === 0 &&
          insights.recommendations.length === 0 && (
            <div className="text-[#888] text-sm">
              Not enough data to generate insights yet. Check back after more families complete setup.
            </div>
          )}
      </div>
    </div>
  );
}

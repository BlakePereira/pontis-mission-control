"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import SetupFunnel from "@/components/analytics/SetupFunnel";
import TimeMetrics from "@/components/analytics/TimeMetrics";
import ConversionInsights from "@/components/analytics/ConversionInsights";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OverviewMetrics {
  started: number;
  completed: number;
  completionRate: number;
  flowers: number;
  flowerRate: number;
  cleaning: number;
  cleaningRate: number;
}

interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

export default function SetupAnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>("30d");
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<OverviewMetrics>({
    started: 0,
    completed: 0,
    completionRate: 0,
    flowers: 0,
    flowerRate: 0,
    cleaning: 0,
    cleaningRate: 0,
  });
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [timeMetrics, setTimeMetrics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const getFilterDate = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  };

  async function fetchAnalytics() {
    setLoading(true);
    const filterDate = getFilterDate();

    try {
      // Fetch all events for the date range
      const { data: events, error } = await supabase
        .from("setup_flow_events")
        .select("*")
        .gte("created_at", filterDate.toISOString());

      if (error) {
        console.error("Error fetching events:", error);
        setLoading(false);
        return;
      }

      if (!events || events.length === 0) {
        console.log("No events found for this date range");
        setLoading(false);
        return;
      }

      // Calculate overview metrics
      const startedMemorials = new Set(
        events
          .filter((e) => e.event_type === "step_view" && e.step_name === "basics")
          .map((e) => e.memorial_id)
      );

      const completedMemorials = new Set(
        events
          .filter((e) => e.event_type === "completion")
          .map((e) => e.memorial_id)
      );

      const flowersYes = events.filter(
        (e) => e.event_type === "decision" && e.decision === "flowers_yes"
      ).length;

      const cleaningYes = events.filter(
        (e) => e.event_type === "decision" && e.decision === "cleaning_yes"
      ).length;

      const started = startedMemorials.size;
      const completed = completedMemorials.size;

      setOverview({
        started,
        completed,
        completionRate: started > 0 ? (completed / started) * 100 : 0,
        flowers: flowersYes,
        flowerRate: started > 0 ? (flowersYes / started) * 100 : 0,
        cleaning: cleaningYes,
        cleaningRate: started > 0 ? (cleaningYes / started) * 100 : 0,
      });

      // Calculate funnel data
      const steps = [
        "basics",
        "first-memory",
        "preview",
        "invite-family",
        "flowers",
        "cleaning",
      ];

      const funnel = steps.map((step) => {
        const viewEvents = events.filter(
          (e) => e.event_type === "step_view" && e.step_name === step
        );
        const completeEvents = events.filter(
          (e) => e.event_type === "step_complete" && e.step_name === step
        );

        const startedUnique = new Set(viewEvents.map((e) => e.memorial_id)).size;
        const completedUnique = new Set(completeEvents.map((e) => e.memorial_id)).size;

        const conversionRate = startedUnique > 0 ? (completedUnique / startedUnique) * 100 : 0;
        const dropOff = startedUnique - completedUnique;
        const dropOffRate = startedUnique > 0 ? (dropOff / startedUnique) * 100 : 0;

        return {
          step,
          started: startedUnique,
          completed: completedUnique,
          conversionRate,
          dropOff,
          dropOffRate,
        };
      });

      setFunnelData(funnel);

      // Calculate device breakdown
      const deviceCounts: Record<string, number> = {};
      events
        .filter((e) => e.event_type === "step_view" && e.step_name === "basics")
        .forEach((e) => {
          const device = e.metadata?.device_type || "Unknown";
          deviceCounts[device] = (deviceCounts[device] || 0) + 1;
        });

      const total = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
      const devices = Object.entries(deviceCounts).map(([device, count]) => ({
        device,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }));

      setDeviceData(devices);

      // Calculate time metrics
      const completionEvents = events.filter((e) => e.event_type === "completion");
      const times: number[] = [];

      completionEvents.forEach((completion) => {
        const memorialEvents = events.filter(
          (e) => e.memorial_id === completion.memorial_id
        );
        const firstEvent = memorialEvents.find(
          (e) => e.event_type === "step_view" && e.step_name === "basics"
        );

        if (firstEvent) {
          const duration =
            (new Date(completion.created_at).getTime() -
              new Date(firstEvent.created_at).getTime()) /
            1000; // seconds
          times.push(duration);
        }
      });

      times.sort((a, b) => a - b);
      const median = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;
      const fastest = times.length > 0 ? times[0] : 0;
      const slowest = times.length > 0 ? times[times.length - 1] : 0;

      // Calculate avg time per step
      const stepTimes: Record<string, number[]> = {};
      steps.forEach((step) => {
        stepTimes[step] = [];
      });

      const memorialIds = new Set(events.map((e) => e.memorial_id));
      memorialIds.forEach((memorialId) => {
        const memorialEvents = events.filter((e) => e.memorial_id === memorialId);

        steps.forEach((step) => {
          const viewEvent = memorialEvents.find(
            (e) => e.event_type === "step_view" && e.step_name === step
          );
          const completeEvent = memorialEvents.find(
            (e) => e.event_type === "step_complete" && e.step_name === step
          );

          if (viewEvent && completeEvent) {
            const duration =
              (new Date(completeEvent.created_at).getTime() -
                new Date(viewEvent.created_at).getTime()) /
              1000;
            stepTimes[step].push(duration);
          }
        });
      });

      const avgStepTimes = Object.entries(stepTimes).map(([step, times]) => {
        const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        return { step, avgSeconds: avg };
      });

      setTimeMetrics({
        median,
        fastest,
        slowest,
        avgStepTimes,
      });
    } catch (error) {
      console.error("Error in fetchAnalytics:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatStepName = (step: string) => {
    const names: Record<string, string> = {
      basics: "Basics",
      "first-memory": "First Memory",
      preview: "Preview",
      "invite-family": "Invite Family",
      flowers: "Flowers",
      cleaning: "Cleaning",
    };
    return names[step] || step;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Family Onboarding Analytics</h1>
          <p className="text-[#888] mt-1">
            Track setup flow drop-off and conversion metrics
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-2 text-white"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-[#888] py-20">Loading analytics...</div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <div className="text-[#888] text-sm mb-2">Started</div>
              <div className="text-3xl font-bold">{overview.started}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <div className="text-[#888] text-sm mb-2">Completed</div>
              <div className="text-3xl font-bold">{overview.completed}</div>
              <div className="text-sm text-[#888] mt-1">
                {overview.completionRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <div className="text-[#888] text-sm mb-2">Flowers</div>
              <div className="text-3xl font-bold">{overview.flowers}</div>
              <div className="text-sm text-[#888] mt-1">
                {overview.flowerRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
              <div className="text-[#888] text-sm mb-2">Cleaning</div>
              <div className="text-3xl font-bold">{overview.cleaning}</div>
              <div className="text-sm text-[#888] mt-1">
                {overview.cleaningRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">🔻 Funnel (Where Drop-off Happens)</h2>
            <SetupFunnel data={funnelData} formatStepName={formatStepName} />
          </div>

          {/* Time Metrics */}
          {timeMetrics && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">⏱️ Time Metrics</h2>
              <TimeMetrics metrics={timeMetrics} formatTime={formatTime} formatStepName={formatStepName} />
            </div>
          )}

          {/* Device Breakdown */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">📱 Device Breakdown</h2>
            <div className="space-y-3">
              {deviceData.map((device) => (
                <div key={device.device}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{device.device}</span>
                    <span className="text-[#888]">
                      {device.count} ({device.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${device.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversion Insights */}
          <ConversionInsights
            funnelData={funnelData}
            timeMetrics={timeMetrics}
            overview={overview}
            formatStepName={formatStepName}
          />
        </>
      )}
    </div>
  );
}

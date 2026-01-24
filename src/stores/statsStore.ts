import { create } from "zustand";

type SummaryMetric = "uniqueCourses" | "enrollment";
type DeptMetric = "uniqueCourses" | "enrollment";

interface StatsState {
  summaryMetric: SummaryMetric;
  summarySplitByLevel: boolean;
  deptMetric: DeptMetric;
  deptSplitByLevel: boolean;
  deptCollegeKey: string | null;
  heatmapSelectedHalls: string[];
  heatmapInitialized: boolean;

  setSummaryMetric: (v: SummaryMetric) => void;
  setSummarySplitByLevel: (v: boolean) => void;
  setDeptMetric: (v: DeptMetric) => void;
  setDeptSplitByLevel: (v: boolean) => void;
  setDeptCollegeKey: (v: string | null) => void;
  setHeatmapSelectedHalls: (v: string[]) => void;
  setHeatmapInitialized: (v: boolean) => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  summaryMetric: "uniqueCourses",
  summarySplitByLevel: false,
  deptMetric: "uniqueCourses",
  deptSplitByLevel: false,
  deptCollegeKey: null,
  heatmapSelectedHalls: [],
  heatmapInitialized: false,

  setSummaryMetric: (summaryMetric) => set({ summaryMetric }),
  setSummarySplitByLevel: (summarySplitByLevel) => set({ summarySplitByLevel }),
  setDeptMetric: (deptMetric) => set({ deptMetric }),
  setDeptSplitByLevel: (deptSplitByLevel) => set({ deptSplitByLevel }),
  setDeptCollegeKey: (deptCollegeKey) => set({ deptCollegeKey }),
  setHeatmapSelectedHalls: (heatmapSelectedHalls) =>
    set({ heatmapSelectedHalls }),
  setHeatmapInitialized: (heatmapInitialized) => set({ heatmapInitialized }),
}));

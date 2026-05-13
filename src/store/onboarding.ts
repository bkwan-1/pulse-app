import { create } from "zustand";

interface OnboardingState {
  step: number;
  schoolName: string;
  educationLevel: string;
  peakHours: string[];
  sleepGoal: number;
  challenges: string[];
  setStep: (step: number) => void;
  setSchoolName: (v: string) => void;
  setEducationLevel: (v: string) => void;
  togglePeakHour: (v: string) => void;
  setSleepGoal: (v: number) => void;
  toggleChallenge: (v: string) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  schoolName: "",
  educationLevel: "",
  peakHours: [],
  sleepGoal: 7,
  challenges: [],
  setStep: (step) => set({ step }),
  setSchoolName: (schoolName) => set({ schoolName }),
  setEducationLevel: (educationLevel) => set({ educationLevel }),
  togglePeakHour: (v) =>
    set((s) => ({
      peakHours: s.peakHours.includes(v)
        ? s.peakHours.filter((h) => h !== v)
        : [...s.peakHours, v],
    })),
  setSleepGoal: (sleepGoal) => set({ sleepGoal }),
  toggleChallenge: (v) =>
    set((s) => ({
      challenges: s.challenges.includes(v)
        ? s.challenges.filter((c) => c !== v)
        : [...s.challenges, v],
    })),
}));

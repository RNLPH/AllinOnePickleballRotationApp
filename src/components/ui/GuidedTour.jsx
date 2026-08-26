import { useState } from "react";

/**
 * GuidedTour — 4-step first-run onboarding for new operators.
 * Shows on first login, then sets localStorage flag to not show again.
 */
const TOUR_KEY = "rallystack_tour_done";

const STEPS = [
  {
    title: "Welcome to RallyStack! 🏓",
    desc: "Let's get you set up in 30 seconds. You'll be running your first session in no time.",
    icon: "👋",
  },
  {
    title: "Step 1: Choose a Mode",
    desc: "Pick how you want to run your session. 'Open Mode' is great for beginners — everyone plays together, winners vs winners.",
    icon: "🎮",
  },
  {
    title: "Step 2: Add Players",
    desc: "Type names in the input bar, or share the Check-in link so players can add themselves. You'll see them in the Waitlist.",
    icon: "👥",
  },
  {
    title: "Step 3: Start Games!",
    desc: "Hit 'Start Game' to auto-fill courts. When a match ends, tap 'Team A Wins' or 'Team B Wins'. Players rotate automatically.",
    icon: "▶️",
  },
];

export function shouldShowTour() {
  return !localStorage.getItem(TOUR_KEY);
}

export function markTourDone() {
  localStorage.setItem(TOUR_KEY, "true");
}

export default function GuidedTour({ onComplete }) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      markTourDone();
      onComplete?.();
    }
  };

  const handleSkip = () => {
    markTourDone();
    onComplete?.();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 animate-scale-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-blue-500 w-5" : i < step ? "bg-blue-300" : "bg-slate-200"}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-4xl mb-3">{current.icon}</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">{current.title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{current.desc}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex-1 h-10 rounded-xl gradient-accent text-white text-sm font-semibold hover:opacity-90"
          >
            {step < STEPS.length - 1 ? "Next" : "Let's Go!"}
          </button>
        </div>
      </div>
    </div>
  );
}

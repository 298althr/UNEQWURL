"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Check, ChevronUp, ChevronDown, GraduationCap } from "lucide-react";

interface Step {
  title: string;
  instruction: string;
  checkpoint: string;
}

const LESSON_STEPS: Step[] = [
  {
    title: "Listen First",
    instruction: "Press play on the track. Listen for 15 seconds without touching anything. Just listen.",
    checkpoint: "Thumbs up when you've listened for 15 seconds.",
  },
  {
    title: "Toggle the Console",
    instruction: "Press 'Console On (298EQ)'. Listen again. What changed? This is the difference between raw and processed audio.",
    checkpoint: "Can you name one thing that changed? Raise your hand.",
  },
  {
    title: "Watch the Spectrum",
    instruction: "Look at the spectrum analyzer. The bars show frequency energy. Left = bass, right = treble. Taller = more energy.",
    checkpoint: "Which side has the tallest bars right now?",
  },
  {
    title: "Boost the Bass",
    instruction: "Move the 'Low' slider to +5 dB. Watch the left side of the spectrum grow. Listen — does it sound boomy?",
    checkpoint: "Thumbs up when the left bars are taller.",
  },
  {
    title: "Cut the Bass",
    instruction: "Now move 'Low' to -5 dB. The left bars shrink. Does it sound thin? You've just heard frequency balance.",
    checkpoint: "Nod if it sounds thinner than before.",
  },
  {
    title: "Find the Vocal",
    instruction: "Move the '298EQ' slider to +3 dB. This boosts 298 Hz — where vocal presence lives. Does the voice cut through more?",
    checkpoint: "Raise your hand if the voice sounds clearer.",
  },
  {
    title: "Check the VU Meter",
    instruction: "Look at the VU meter on the right. The Peak bar shows the loudest instant. The RMS bar shows average loudness. Is the Peak bar in the green zone?",
    checkpoint: "Is RMS between -18 and -12 dB? That's healthy.",
  },
  {
    title: "Try a Preset",
    instruction: "Click the 'Vocal Boost' preset pill above the sliders. Listen. What changed? This is a starting point — not an answer.",
    checkpoint: "Can you describe what the preset did in one sentence?",
  },
  {
    title: "A/B Test",
    instruction: "Press 'Console Off (Original)'. Listen. Press 'Console On' again. Is your EQ actually better — or just louder?",
    checkpoint: "Hold up 2 fingers if it's better, 1 if it's just louder.",
  },
  {
    title: "Save Your Work",
    instruction: "Click '+ Save' in the presets section. Name your preset. This is YOUR taste for this track.",
    checkpoint: "Thumbs up when you've saved your preset.",
  },
];

interface LessonModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string | null;
  isPlaying?: boolean;
  hasAdjustedEQ?: boolean;
}

export default function LessonModeOverlay({ isOpen, onClose, sessionId = null, isPlaying = false, hasAdjustedEQ = false }: LessonModeOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() => LESSON_STEPS.map(() => false));
  const [isMinimized, setIsMinimized] = useState(false);
  const [showGateWarning, setShowGateWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setCompleted(LESSON_STEPS.map(() => false));
      setIsMinimized(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = LESSON_STEPS[currentStep];
  const progress = ((currentStep + 1) / LESSON_STEPS.length) * 100;
  const allDone = completed.every(Boolean);

  const handleNext = () => {
    if (currentStep < LESSON_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Soft gating: step 0 requires audio to have been played
    if (currentStep === 0 && !isPlaying) {
      setShowGateWarning(true);
      return;
    }
    // Step 3 (Adjust EQ) requires at least one slider change
    if (currentStep === 3 && !hasAdjustedEQ) {
      setShowGateWarning(true);
      return;
    }

    const updated = [...completed];
    updated[currentStep] = true;
    setCompleted(updated);

    // POST completion to server if session is active
    if (sessionId) {
      fetch("/api/lesson-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, step_index: currentStep }),
      }).catch(() => {});
    }

    if (currentStep < LESSON_STEPS.length - 1) {
      handleNext();
    }
  };

  return createPortal(
    <div className={`lesson-float${isMinimized ? " lesson-float--minimized" : ""}`}>
      {/* Floating header bar — always visible */}
      <div className="lesson-float-header">
        <div className="lesson-float-header-left">
          <GraduationCap size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span className="lesson-float-step-pill">
            {currentStep + 1}/{LESSON_STEPS.length}
            {completed[currentStep] && <Check size={10} style={{ marginLeft: "4px", color: "#22c55e" }} />}
          </span>
          <span className="lesson-float-title-mini">{step.title}</span>
        </div>
        <div className="lesson-float-header-actions">
          <button
            type="button"
            onClick={() => setIsMinimized((m) => !m)}
            className="lesson-float-icon-btn"
            title={isMinimized ? "Expand lesson" : "Minimise lesson"}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button type="button" onClick={onClose} className="lesson-float-icon-btn" title="Exit lesson mode">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!isMinimized && (
        <div className="lesson-float-progress">
          <div className="lesson-float-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Step content — hidden when minimized */}
      {!isMinimized && (
        <div className="lesson-float-body">
          {showGateWarning && (
            <div className="lesson-gate-warning">
              {currentStep === 0
                ? "▶ Play the track first, then mark this step complete."
                : "🎚️ Adjust at least one EQ slider first, then mark this step complete."}
              <button type="button" onClick={() => setShowGateWarning(false)} className="lesson-gate-dismiss">Got it</button>
            </div>
          )}
          <p className="lesson-float-instruction">{step.instruction}</p>

          <div className="lesson-float-checkpoint">
            <span className="lesson-checkpoint-label">Checkpoint:</span>
            <span>{step.checkpoint}</span>
          </div>

          <div className="lesson-float-nav">
            <button
              type="button"
              onClick={handlePrev}
              className="btn btn-secondary lesson-nav-btn"
              disabled={currentStep === 0}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className={`btn lesson-nav-btn${completed[currentStep] ? " btn-secondary" : " btn-primary"}`}
            >
              {completed[currentStep] ? <><Check size={13} /> Done</> : "Mark Complete"}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary lesson-nav-btn"
              disabled={currentStep === LESSON_STEPS.length - 1}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {allDone && (
            <div className="lesson-complete-banner">
              All steps complete! 🎓
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

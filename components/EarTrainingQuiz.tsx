"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Brain, Check, X, RotateCcw, AlertTriangle, Gauge, SlidersHorizontal } from "lucide-react";
import type { EQSettings } from "@/lib/types";
import { computeScore } from "@/lib/scoring";

interface EarTrainingQuizProps {
  audioContext: AudioContext | null;
  sourceNode: AudioNode | null;
  destinationNode: AudioNode | null;
  applyEQ: (settings: EQSettings) => void;
  getCurrentEQ: () => EQSettings;
}

interface FixTask {
  id: string;
  prompt: string;
  degradedSettings: EQSettings;
  benchmarkSettings: EQSettings;
  benchmarkWeights: EQSettings;
  hint: string;
}

const FLAT: EQSettings = { low: 0, mid: 0, high: 0, gain: 0, eq298: 0 };

const DEFAULT_WEIGHTS: EQSettings = { low: 25, mid: 20, high: 20, gain: 10, eq298: 25 };

const FIX_TASKS: FixTask[] = [
  {
    id: "t1",
    prompt: "This mix is too boomy and muddy. Use the EQ sliders to fix it toward a balanced sound.",
    degradedSettings: { low: 10, mid: 6, high: -6, gain: 0, eq298: -4 },
    benchmarkSettings: FLAT,
    benchmarkWeights: DEFAULT_WEIGHTS,
    hint: "Cut the Low and Mid bands. Boost High slightly to restore clarity.",
  },
  {
    id: "t2",
    prompt: "This vocal is buried and harsh. Fix the EQ to bring the vocal forward and tame the harshness.",
    degradedSettings: { low: 3, mid: -4, high: 8, gain: 0, eq298: -8 },
    benchmarkSettings: { low: -5, mid: 3, high: 6, gain: 0, eq298: 7 },
    benchmarkWeights: DEFAULT_WEIGHTS,
    hint: "Boost 298EQ for vocal presence. Cut High to reduce harshness. Boost Mid slightly.",
  },
  {
    id: "t3",
    prompt: "This track sounds thin and lacks warmth. Adjust the EQ to make it fuller and more natural.",
    degradedSettings: { low: -8, mid: -2, high: 5, gain: 0, eq298: -3 },
    benchmarkSettings: { low: 4, mid: 0, high: 0, gain: 0, eq298: 2 },
    benchmarkWeights: DEFAULT_WEIGHTS,
    hint: "Boost Low to add warmth. Cut High to reduce thinness. Slight 298EQ boost for presence.",
  },
];

export default function EarTrainingQuiz({ audioContext, sourceNode, destinationNode, applyEQ, getCurrentEQ }: EarTrainingQuizProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentTask, setCurrentTask] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [taskScores, setTaskScores] = useState<number[]>([]);
  const originalEQRef = useRef<EQSettings | null>(null);
  const applyEQRef = useRef(applyEQ);
  applyEQRef.current = applyEQ;
  const getCurrentEQRef = useRef(getCurrentEQ);
  getCurrentEQRef.current = getCurrentEQ;

  useEffect(() => {
    return () => {
      if (originalEQRef.current) {
        applyEQRef.current(originalEQRef.current);
      }
    };
  }, []);

  // Live score computation
  const computeLiveScore = useCallback(() => {
    const task = FIX_TASKS[currentTask];
    if (!task) return;
    const current = getCurrentEQRef.current();
    const { score } = computeScore(current, task.benchmarkSettings, task.benchmarkWeights);
    setLiveScore(score);
  }, [currentTask]);

  // Update live score whenever EQ changes
  useEffect(() => {
    if (!isOpen || submitted) return;
    const interval = setInterval(computeLiveScore, 200);
    return () => clearInterval(interval);
  }, [isOpen, submitted, computeLiveScore]);

  const open = () => {
    setShowConfirm(false);
    originalEQRef.current = getCurrentEQ();
    setIsOpen(true);
    setCurrentTask(0);
    setSubmitted(false);
    setShowHint(false);
    setTaskScores([]);
    const task = FIX_TASKS[0];
    applyEQ(task.degradedSettings);
    setLiveScore(0);
  };

  const close = () => {
    if (originalEQRef.current) {
      applyEQ(originalEQRef.current);
    }
    setIsOpen(false);
  };

  const handleSubmit = () => {
    const task = FIX_TASKS[currentTask];
    const current = getCurrentEQ();
    const { score } = computeScore(current, task.benchmarkSettings, task.benchmarkWeights);
    setFinalScore(score);
    setSubmitted(true);
    setTaskScores([...taskScores, score]);
  };

  const handleNext = () => {
    if (currentTask < FIX_TASKS.length - 1) {
      const next = currentTask + 1;
      setCurrentTask(next);
      setSubmitted(false);
      setShowHint(false);
      setLiveScore(0);
      applyEQ(FIX_TASKS[next].degradedSettings);
    }
  };

  const handleRestart = () => {
    if (originalEQRef.current) {
      applyEQ(originalEQRef.current);
    }
    setCurrentTask(0);
    setSubmitted(false);
    setShowHint(false);
    setTaskScores([]);
    applyEQ(FIX_TASKS[0].degradedSettings);
    setLiveScore(0);
  };

  const allDone = currentTask === FIX_TASKS.length - 1 && submitted;
  const avgScore = taskScores.length > 0
    ? Math.round(taskScores.reduce((a, b) => a + b, 0) / taskScores.length)
    : 0;

  if (!isOpen) {
    return (
      <div className="ear-training-container">
        <button type="button" onClick={() => setShowConfirm(true)} className="btn btn-secondary ear-training-start-btn">
          <Brain size={14} />
          Start Ear Training Quiz
        </button>
        <span className="ear-training-hint">Fix deliberately broken mixes using EQ. Scored by how close you get to the benchmark.</span>

        {showConfirm && createPortal(
          <div className="ear-training-confirm-overlay">
            <div className="ear-training-confirm-card">
              <div className="ear-training-confirm-icon">
                <AlertTriangle size={20} />
              </div>
              <h4 className="ear-training-confirm-title">Start Ear Training Quiz?</h4>
              <p className="ear-training-confirm-msg">
                You&apos;ll hear a deliberately degraded mix. Use the EQ sliders to fix it toward a balanced sound. Your score is based on how close you get to the benchmark. Your current settings will be restored when you exit.
              </p>
              <div className="ear-training-confirm-actions">
                <button type="button" onClick={() => setShowConfirm(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={open} className="btn btn-primary">
                  Start Quiz
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  const task = FIX_TASKS[currentTask];
  const scoreColor = liveScore >= 71 ? "#22c55e" : liveScore >= 41 ? "#eab308" : "#ef4444";

  return (
    <div className="ear-training-quiz">
      <div className="ear-training-quiz-header">
        <div className="ear-training-quiz-title">
          <Brain size={16} />
          Ear Training — Fix the Mix
        </div>
        <button type="button" onClick={close} className="ear-training-close">Exit Quiz</button>
      </div>

      <div className="ear-training-progress">
        Task {currentTask + 1} of {FIX_TASKS.length}
        {taskScores.length > 0 && ` · Completed scores: ${taskScores.map((s) => Math.round(s)).join(", ")}`}
      </div>

      {!allDone ? (
        <>
          <p className="ear-training-prompt">{task.prompt}</p>

          {/* Live quality score */}
          <div className="ear-training-live-score">
            <div className="ear-training-live-score-header">
              <Gauge size={12} />
              <span className="ear-training-live-score-label">Sound Quality</span>
              <span className="ear-training-live-score-value" style={{ color: scoreColor }}>
                {submitted ? Math.round(finalScore) : Math.round(liveScore)}/100
              </span>
            </div>
            <div className="ear-training-live-score-track">
              <div
                className="ear-training-live-score-fill"
                style={{
                  width: `${Math.max(2, submitted ? finalScore : liveScore)}%`,
                  background: submitted ? scoreColor : scoreColor,
                }}
              />
            </div>
          </div>

          {submitted ? (
            <div className="ear-training-feedback">
              <p className="ear-training-correct" style={{ color: finalScore >= 71 ? "#22c55e" : finalScore >= 41 ? "#eab308" : "#ef4444" }}>
                You scored {Math.round(finalScore)}/100 on this task.
              </p>
              <p className="ear-training-hint-text" style={{ marginTop: "6px" }}>{task.hint}</p>
              <button type="button" onClick={handleNext} className="btn btn-primary ear-training-next-btn">
                {currentTask < FIX_TASKS.length - 1 ? "Next Task" : "See Results"}
              </button>
            </div>
          ) : (
            <>
              <div className="ear-training-fix-hint">
                <SlidersHorizontal size={12} />
                <span>Use the EQ sliders below to fix the mix. The score updates live as you adjust.</span>
              </div>

              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="ear-training-hint-btn"
              >
                {showHint ? "Hide hint" : "Need a hint?"}
              </button>
              {showHint && (
                <p className="ear-training-hint-text">{task.hint}</p>
              )}

              <button type="button" onClick={handleSubmit} className="btn btn-primary ear-training-submit-btn">
                Submit My Fix
              </button>
            </>
          )}
        </>
      ) : (
        <div className="ear-training-results">
          <h3 className="ear-training-score-title">
            Average Score: {avgScore}/100
          </h3>
          <div className="ear-training-task-breakdown">
            {taskScores.map((s, i) => (
              <div key={i} className="ear-training-task-score">
                <span>Task {i + 1}</span>
                <span style={{ color: s >= 71 ? "#22c55e" : s >= 41 ? "#eab308" : "#ef4444", fontWeight: 700 }}>
                  {Math.round(s)}/100
                </span>
              </div>
            ))}
          </div>
          <p className="ear-training-score-desc">
            {avgScore >= 80 ? "Excellent! You can fix EQ problems by ear. You're ready for advanced mixing." :
             avgScore >= 60 ? "Good ear! You can fix most common EQ problems. Keep practicing." :
             avgScore >= 40 ? "You're developing your ear. Listen to more reference tracks and try again." :
             "Keep training. Focus on matching the benchmark sound."}
          </p>
          <div className="ear-training-results-actions">
            <button type="button" onClick={handleRestart} className="btn btn-secondary">
              <RotateCcw size={14} /> Try Again
            </button>
            <button type="button" onClick={close} className="btn btn-primary">
              Back to EQ Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

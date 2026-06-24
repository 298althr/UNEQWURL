"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Brain, Check, X, RotateCcw, AlertTriangle, Gauge, SlidersHorizontal,
  Music, Target, Activity, Trophy, Cloud, MoveHorizontal, Volume2, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { EQSettings } from "@/lib/types";
import type { ConsoleSettings } from "@/lib/audio-chain";
import { computeScore } from "@/lib/scoring";
import {
  type TrainingMode,
  type TrainingTask,
  ALL_TRAINING_TASKS,
  TRAINING_MODE_INFO,
  getTasksForMode,
} from "@/lib/training-tasks";
import { getDefaultConsoleSettings } from "@/lib/audio-chain";

/**
 * Score console settings against a target. Compares compressor params, width, gain, pan.
 * Returns 0-100 score.
 */
function computeConsoleScore(
  current: ConsoleSettings,
  target: ConsoleSettings,
): number {
  let penalty = 0;
  let maxPenalty = 0;

  // Compressor params (if target has compressor enabled)
  if (target.compressor.enabled) {
    if (target.compressor.enabled !== current.compressor.enabled) {
      penalty += 30;
    } else if (current.compressor.enabled) {
      penalty += Math.min(15, Math.abs(current.compressor.threshold - target.compressor.threshold) * 1.5);
      penalty += Math.min(10, Math.abs(current.compressor.ratio - target.compressor.ratio) * 3);
      penalty += Math.min(5, Math.abs(current.compressor.attack - target.compressor.attack) * 50);
      penalty += Math.min(5, Math.abs(current.compressor.release - target.compressor.release) * 20);
    }
    maxPenalty += 30 + 15 + 10 + 5 + 5;
  }

  // Limiter
  if (target.limiter.enabled) {
    if (target.limiter.enabled !== current.limiter.enabled) {
      penalty += 15;
    }
    maxPenalty += 15;
  }

  // Width
  penalty += Math.min(20, Math.abs(current.width - target.width) * 20);
  maxPenalty += 20;

  // Gain
  penalty += Math.min(10, Math.abs(current.gain - target.gain) * 2);
  maxPenalty += 10;

  // Pan
  penalty += Math.min(10, Math.abs(current.pan - target.pan) * 20);
  maxPenalty += 10;

  const score = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));
  return score;
}

/**
 * Combined score: if task has targetConsole, blend EQ and console scores.
 */
function computeTaskScore(
  task: TrainingTask,
  currentEQ: EQSettings,
  currentConsole: ConsoleSettings | null,
): number {
  const { score: eqScore } = computeScore(currentEQ, task.targetEQ, task.weights);

  if (task.targetConsole && currentConsole) {
    const consoleScore = computeConsoleScore(currentConsole, task.targetConsole);
    // Console-focused tasks: weight console score higher
    const eqWeight = task.targetEQ.low === 0 && task.targetEQ.mid === 0 && task.targetEQ.high === 0
      ? 0.2  // EQ is flat → mostly console task
      : 0.5; // Mixed task
    return Math.round(eqScore * eqWeight + consoleScore * (1 - eqWeight));
  }

  return eqScore;
}

type Props = {
  applyEQ: (settings: EQSettings) => void;
  getCurrentEQ: () => EQSettings;
  applyConsole?: (settings: ConsoleSettings) => void;
  getCurrentConsole?: () => ConsoleSettings;
};

const MODE_ICONS: Record<string, LucideIcon> = {
  music: Music,
  target: Target,
  alert: AlertTriangle,
  gauge: Gauge,
  move: MoveHorizontal,
  trophy: Trophy,
  activity: Activity,
  cloud: Cloud,
};

export default function AdvancedTraining({ applyEQ, getCurrentEQ, applyConsole, getCurrentConsole }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [taskScores, setTaskScores] = useState<number[]>([]);
  const [problemAnswer, setProblemAnswer] = useState<string | null>(null);
  const [problemSubmitted, setProblemSubmitted] = useState(false);

  const originalEQRef = useRef<EQSettings | null>(null);
  const originalConsoleRef = useRef<ConsoleSettings | null>(null);
  const applyEQRef = useRef(applyEQ);
  applyEQRef.current = applyEQ;
  const getCurrentEQRef = useRef(getCurrentEQ);
  getCurrentEQRef.current = getCurrentEQ;
  const getCurrentConsoleRef = useRef(getCurrentConsole ?? null);
  getCurrentConsoleRef.current = getCurrentConsole ?? null;

  // Restore original settings on unmount
  useEffect(() => {
    return () => {
      if (originalEQRef.current) {
        applyEQRef.current(originalEQRef.current);
      }
      if (originalConsoleRef.current && applyConsole) {
        applyConsole(originalConsoleRef.current);
      }
    };
  }, [applyConsole]);

  const tasks = selectedMode ? getTasksForMode(selectedMode) : [];
  const currentTask = tasks[currentTaskIdx];

  // Live score computation
  const computeLiveScore = useCallback(() => {
    if (!currentTask) return;
    const current = getCurrentEQRef.current();
    const currentConsole = getCurrentConsoleRef.current ? getCurrentConsoleRef.current() : null;
    const score = computeTaskScore(currentTask, current, currentConsole);
    setLiveScore(score);
  }, [currentTask]);

  useEffect(() => {
    if (!isOpen || submitted || !selectedMode) return;
    const interval = setInterval(computeLiveScore, 200);
    return () => clearInterval(interval);
  }, [isOpen, submitted, computeLiveScore, selectedMode]);

  const openMode = (mode: TrainingMode) => {
    setSelectedMode(mode);
    originalEQRef.current = getCurrentEQ();
    if (getCurrentConsole) {
      originalConsoleRef.current = getCurrentConsole();
    }
    const taskList = getTasksForMode(mode);
    setCurrentTaskIdx(0);
    setSubmitted(false);
    setShowHint(false);
    setTaskScores([]);
    setLiveScore(0);
    setProblemAnswer(null);
    setProblemSubmitted(false);
    const first = taskList[0];
    if (first) {
      applyEQ(first.degradedEQ);
      if (applyConsole && first.degradedConsole) {
        applyConsole(first.degradedConsole);
      }
    }
    setIsOpen(true);
  };

  const close = () => {
    if (originalEQRef.current) {
      applyEQ(originalEQRef.current);
    }
    if (originalConsoleRef.current && applyConsole) {
      applyConsole(originalConsoleRef.current);
    }
    setIsOpen(false);
    setSelectedMode(null);
  };

  const handleSubmit = () => {
    if (!currentTask) return;

    if (currentTask.mode === "problem-detection") {
      setProblemSubmitted(true);
      const correct = problemAnswer === currentTask.correctAnswer;
      const score = correct ? 100 : 0;
      setFinalScore(score);
      setSubmitted(true);
      setTaskScores([...taskScores, score]);
      return;
    }

    const current = getCurrentEQ();
    const currentConsole = getCurrentConsole ? getCurrentConsole() : null;
    const score = computeTaskScore(currentTask, current, currentConsole);
    setFinalScore(score);
    setSubmitted(true);
    setTaskScores([...taskScores, score]);
  };

  const handleNext = () => {
    if (currentTaskIdx < tasks.length - 1) {
      const next = currentTaskIdx + 1;
      setCurrentTaskIdx(next);
      setSubmitted(false);
      setShowHint(false);
      setLiveScore(0);
      setProblemAnswer(null);
      setProblemSubmitted(false);
      applyEQ(tasks[next].degradedEQ);
      if (applyConsole && tasks[next].degradedConsole) {
        applyConsole(tasks[next].degradedConsole);
      }
    }
  };

  const handleRestart = () => {
    if (originalEQRef.current) applyEQ(originalEQRef.current);
    if (originalConsoleRef.current && applyConsole) applyConsole(originalConsoleRef.current);
    setCurrentTaskIdx(0);
    setSubmitted(false);
    setShowHint(false);
    setTaskScores([]);
    setLiveScore(0);
    setProblemAnswer(null);
    setProblemSubmitted(false);
    if (tasks[0]) {
      applyEQ(tasks[0].degradedEQ);
      if (applyConsole && tasks[0].degradedConsole) {
        applyConsole(tasks[0].degradedConsole);
      }
    }
  };

  const allDone = currentTaskIdx === tasks.length - 1 && submitted;
  const avgScore = taskScores.length > 0
    ? Math.round(taskScores.reduce((a, b) => a + b, 0) / taskScores.length)
    : 0;

  // Mode selection screen
  if (!isOpen) {
    return (
      <div className="adv-training-container">
        <button type="button" onClick={() => setShowConfirm(true)} className="btn btn-secondary adv-training-start-btn">
          <Brain size={14} />
          Advanced Training
        </button>
        <span className="adv-training-hint">Genre-aware, reference matching, problem detection, mastering chain, and more.</span>

        {showConfirm && createPortal(
          <div className="ear-training-confirm-overlay" onClick={() => setShowConfirm(false)}>
            <div className="adv-training-mode-picker" onClick={(e) => e.stopPropagation()}>
              <div className="adv-training-picker-header">
                <Brain size={20} />
                <h4>Choose a Training Mode</h4>
              </div>
              <div className="adv-training-mode-grid">
                {(Object.keys(TRAINING_MODE_INFO) as TrainingMode[]).map((mode) => {
                  const info = TRAINING_MODE_INFO[mode];
                  const Icon = MODE_ICONS[info.icon] || Brain;
                  const count = ALL_TRAINING_TASKS[mode].length;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setShowConfirm(false); openMode(mode); }}
                      className="adv-training-mode-card"
                    >
                      <div className="adv-training-mode-icon">
                        <Icon size={16} />
                      </div>
                      <div className="adv-training-mode-text">
                        <span className="adv-training-mode-name">{info.label}</span>
                        <span className="adv-training-mode-desc">{info.description}</span>
                      </div>
                      <div className="adv-training-mode-count">{count} tasks</div>
                      <ChevronRight size={14} className="adv-training-mode-arrow" />
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setShowConfirm(false)} className="btn btn-secondary adv-training-cancel">
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  if (!currentTask || !selectedMode) return null;

  const modeInfo = TRAINING_MODE_INFO[selectedMode];
  const ModeIcon = MODE_ICONS[modeInfo.icon] || Brain;
  const scoreColor = liveScore >= 71 ? "#22c55e" : liveScore >= 41 ? "#eab308" : "#ef4444";
  const isProblemMode = currentTask.mode === "problem-detection";

  return (
    <div className="adv-training-quiz">
      <div className="adv-training-quiz-header">
        <div className="adv-training-quiz-title">
          <ModeIcon size={16} />
          {modeInfo.label}
        </div>
        <button type="button" onClick={close} className="ear-training-close">Exit</button>
      </div>

      <div className="ear-training-progress">
        Task {currentTaskIdx + 1} of {tasks.length}
        {taskScores.length > 0 && ` · Scores: ${taskScores.map((s) => Math.round(s)).join(", ")}`}
      </div>

      {/* Metadata badges */}
      <div className="adv-training-badges">
        {currentTask.genre && <span className="adv-training-badge">Genre: {currentTask.genre}</span>}
        {currentTask.bpm && <span className="adv-training-badge">{currentTask.bpm} BPM</span>}
        {currentTask.key && <span className="adv-training-badge">Key: {currentTask.key}</span>}
        {currentTask.platform && <span className="adv-training-badge">{currentTask.platform}</span>}
        {currentTask.targetLufs && <span className="adv-training-badge">Target: {currentTask.targetLufs} LUFS</span>}
      </div>

      {!allDone ? (
        <>
          <p className="ear-training-prompt">{currentTask.prompt}</p>

          {/* Problem detection: multiple choice */}
          {isProblemMode && !problemSubmitted && (
            <div className="adv-training-choices">
              {currentTask.problemOptions?.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setProblemAnswer(opt)}
                  className={`adv-training-choice${problemAnswer === opt ? " selected" : ""}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Problem detection: result */}
          {isProblemMode && problemSubmitted && (
            <div className="ear-training-feedback">
              <p className="ear-training-correct" style={{
                color: problemAnswer === currentTask.correctAnswer ? "#22c55e" : "#ef4444",
              }}>
                {problemAnswer === currentTask.correctAnswer ? "Correct! " : "Incorrect. "}
                Answer: {currentTask.correctAnswer}
              </p>
              <p className="ear-training-hint-text" style={{ marginTop: "6px" }}>{currentTask.hint}</p>
              <button type="button" onClick={handleNext} className="btn btn-primary ear-training-next-btn">
                {currentTaskIdx < tasks.length - 1 ? "Next Task" : "See Results"}
              </button>
            </div>
          )}

          {/* Non-problem modes: live score + submit */}
          {!isProblemMode && (
            <>
              <div className="ear-training-live-score">
                <div className="ear-training-live-score-header">
                  <Gauge size={12} />
                  <span className="ear-training-live-score-label">Match Score</span>
                  <span className="ear-training-live-score-value" style={{ color: scoreColor }}>
                    {submitted ? Math.round(finalScore) : Math.round(liveScore)}/100
                  </span>
                </div>
                <div className="ear-training-live-score-track">
                  <div
                    className="ear-training-live-score-fill"
                    style={{
                      width: `${Math.max(2, submitted ? finalScore : liveScore)}%`,
                      background: scoreColor,
                    }}
                  />
                </div>
              </div>

              {submitted ? (
                <div className="ear-training-feedback">
                  <p className="ear-training-correct" style={{ color: scoreColor }}>
                    You scored {Math.round(finalScore)}/100 on this task.
                  </p>
                  <p className="ear-training-hint-text" style={{ marginTop: "6px" }}>{currentTask.hint}</p>
                  <button type="button" onClick={handleNext} className="btn btn-primary ear-training-next-btn">
                    {currentTaskIdx < tasks.length - 1 ? "Next Task" : "See Results"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="ear-training-fix-hint">
                    <SlidersHorizontal size={12} />
                    <span>Use the EQ sliders and console controls to match the target. Score updates live.</span>
                  </div>
                  <button type="button" onClick={() => setShowHint(!showHint)} className="ear-training-hint-btn">
                    {showHint ? "Hide hint" : "Need a hint?"}
                  </button>
                  {showHint && <p className="ear-training-hint-text">{currentTask.hint}</p>}
                  <button type="button" onClick={handleSubmit} className="btn btn-primary ear-training-submit-btn">
                    Submit My Answer
                  </button>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <div className="ear-training-results">
          <h3 className="ear-training-score-title">Average Score: {avgScore}/100</h3>
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
            {avgScore >= 80 ? "Excellent! You have strong mixing ears." :
             avgScore >= 60 ? "Good work! Keep refining your listening skills." :
             avgScore >= 40 ? "You're developing your ear. Keep practicing." :
             "Keep training. Focus on the target sound."}
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

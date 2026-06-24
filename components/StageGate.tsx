"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  BookOpen,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  Clock,
} from "lucide-react";
import {
  LEARNING_STAGES,
  TOTAL_STAGES,
  type LearningStage,
  type QuizQuestion,
  type StageStatus,
  saveStageProgress,
  resetStageProgress,
} from "@/lib/staged-learning";

interface StageGateProps {
  currentStage: number;
  stageStatusMap: Record<number, StageStatus>;
  onStageComplete: (nextStage: number) => void;
}

export default function StageGate({ currentStage, stageStatusMap, onStageComplete }: StageGateProps) {
  const [expanded, setExpanded] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const stage = LEARNING_STAGES.find((s) => s.id === currentStage);
  if (!stage) return null;

  const isLastStage = currentStage >= TOTAL_STAGES;

  const handleAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleSubmitQuiz = () => {
    const allAnswered = stage.quiz.every((_, i) => quizAnswers[i] !== undefined);
    if (!allAnswered) return;

    const correct = stage.quiz.every((q, i) => quizAnswers[i] === q.answer);
    setQuizSubmitted(true);
    setAllCorrect(correct);

    if (correct) {
      const next = Math.min(currentStage + 1, TOTAL_STAGES);
      saveStageProgress(currentStage, "completed");
      setTimeout(() => {
        onStageComplete(next);
        setExpanded(false);
        setShowQuiz(false);
        setQuizAnswers({});
        setQuizSubmitted(false);
        setAllCorrect(false);
      }, 1500);
    }
  };

  const handleRetry = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setAllCorrect(false);
  };

  const handleSkipStage = () => {
    // Mark current stage as "pending" (yellow) instead of "completed" (green)
    saveStageProgress(currentStage, "pending");
    const next = Math.min(currentStage + 1, TOTAL_STAGES);
    onStageComplete(next);
    setExpanded(false);
    setShowQuiz(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const handleResetAll = () => {
    resetStageProgress();
    onStageComplete(1);
    setExpanded(true);
    setShowQuiz(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  return (
    <div className="stage-gate-container">
      {/* Progress bar */}
      <div className="stage-progress-bar">
        <div className="stage-progress-track">
          <div
            className="stage-progress-fill"
            style={{ width: `${(currentStage / TOTAL_STAGES) * 100}%` }}
          />
        </div>
        <div className="stage-progress-dots">
          {LEARNING_STAGES.map((s) => {
            const status = stageStatusMap[s.id] || (s.id < currentStage ? "completed" : s.id === currentStage ? "pending" : "locked");
            const cls = status === "completed" ? " done" : status === "pending" ? " pending" : s.id === currentStage ? " current" : "";
            return (
              <div
                key={s.id}
                className={`stage-dot${cls}`}
                title={s.name + (status === "pending" ? " (skipped — return later)" : status === "completed" ? " (completed)" : "")}
              >
                {status === "completed" ? <CheckCircle2 size={12} /> : status === "pending" ? <Clock size={12} /> : s.id}
              </div>
            );
          })}
          <button
            type="button"
            className="stage-restart-btn"
            onClick={handleResetAll}
            title="Restart tutorial from Stage 1"
          >
            <RotateCcw size={11} />
            Restart
          </button>
        </div>
      </div>

      {/* Stage header */}
      <div className="stage-gate-header" onClick={() => setExpanded(!expanded)}>
        <div className="stage-gate-header-left">
          <div className="stage-badge">Stage {stage.id}/{TOTAL_STAGES}</div>
          <div>
            <div className="stage-gate-title">{stage.name}</div>
            <div className="stage-gate-tagline">{stage.tagline}</div>
          </div>
        </div>
        <div className="stage-gate-header-right">
          <button
            type="button"
            className="stage-collapse-btn"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="stage-gate-body">
          {/* Hints */}
          <div className="stage-hints-section">
            <div className="stage-hints-header">
              <BookOpen size={14} />
              <span>Knowledge Guide</span>
            </div>
            {stage.hints.map((hint, i) => (
              <div key={i} className="stage-hint-item">
                <Lightbulb size={12} className="stage-hint-icon" />
                <p>{hint}</p>
              </div>
            ))}
          </div>

          {/* Quiz section */}
          {!showQuiz ? (
            <button
              type="button"
              className="btn btn-primary stage-start-quiz-btn"
              onClick={() => setShowQuiz(true)}
            >
              <HelpCircle size={16} />
              {isLastStage ? "Take Final Quiz" : "Take Quiz to Unlock Next Stage"}
            </button>
          ) : (
            <div className="stage-quiz-section">
              <div className="stage-quiz-header">
                <HelpCircle size={14} />
                <span>{isLastStage ? "Final Assessment" : "Stage Quiz"}</span>
                <span className="stage-quiz-count">{stage.quiz.length} questions</span>
              </div>

              {stage.quiz.map((question, qIdx) => (
                <QuizCard
                  key={qIdx}
                  question={question}
                  index={qIdx}
                  selected={quizAnswers[qIdx]}
                  submitted={quizSubmitted}
                  onSelect={(optIdx) => handleAnswer(qIdx, optIdx)}
                />
              ))}

              {quizSubmitted && (
                <div className={`stage-quiz-result${allCorrect ? " pass" : " fail"}`}>
                  {allCorrect ? (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Perfect! Unlocking next stage...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      <span>Some answers incorrect. Review the hints and try again.</span>
                    </>
                  )}
                </div>
              )}

              <div className="stage-quiz-actions">
                {!quizSubmitted ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowQuiz(false)}
                    >
                      Back to Hints
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSubmitQuiz}
                      disabled={!stage.quiz.every((_, i) => quizAnswers[i] !== undefined)}
                    >
                      Submit Answers
                      <ArrowRight size={14} />
                    </button>
                  </>
                ) : !allCorrect ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleRetry}
                  >
                    <RotateCcw size={14} />
                    Retry Quiz
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Skip / Reset */}
          <div className="stage-gate-footer">
            <button
              type="button"
              className="stage-skip-btn"
              onClick={handleSkipStage}
            >
              Skip stage for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCard({
  question,
  index,
  selected,
  submitted,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  selected: number | undefined;
  submitted: boolean;
  onSelect: (optIdx: number) => void;
}) {
  const isCorrect = selected === question.answer;
  return (
    <div className="stage-quiz-card">
      <div className="stage-quiz-question">
        <span className="stage-quiz-q-num">Q{index + 1}</span>
        {question.q}
      </div>
      <div className="stage-quiz-options">
        {question.options.map((opt, optIdx) => {
          const isSelected = selected === optIdx;
          const isAnswer = optIdx === question.answer;
          let cls = "stage-quiz-option";
          if (submitted) {
            if (isAnswer) cls += " correct";
            else if (isSelected && !isAnswer) cls += " incorrect";
          } else if (isSelected) {
            cls += " selected";
          }
          return (
            <button
              key={optIdx}
              type="button"
              className={cls}
              onClick={() => onSelect(optIdx)}
              disabled={submitted}
            >
              <span className="stage-quiz-option-letter">
                {String.fromCharCode(65 + optIdx)}
              </span>
              {opt}
              {submitted && isAnswer && <CheckCircle2 size={14} className="stage-quiz-option-icon" />}
            </button>
          );
        })}
      </div>
      {submitted && (
        <div className={`stage-quiz-explanation${isCorrect ? " correct" : " incorrect"}`}>
          {isCorrect ? "✓ " : "✗ "}{question.explanation}
        </div>
      )}
    </div>
  );
}

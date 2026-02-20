import React, { useState } from 'react';
import QuestionCard, { Question } from './QuestionCard';
import Timer from './Timer';
import Results from './Results';
import { ChevronRight } from 'lucide-react';

interface QuizPlayerProps {
  questions: Question[];
  timeLimit?: number; // in seconds
  onComplete?: (score: number) => void;
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({ 
  questions, 
  timeLimit = 600, // 10 minutes default
  onComplete 
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const handleOptionSelect = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    let calculatedScore = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        calculatedScore++;
      }
    });
    setScore(calculatedScore);
    setIsFinished(true);
    if (onComplete) {
      onComplete(calculatedScore);
    }
  };

  const handleTimeUp = () => {
    finishQuiz();
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Array(questions.length).fill(null));
    setIsFinished(false);
    setScore(0);
  };

  if (isFinished) {
    return (
      <Results 
        score={score} 
        totalQuestions={questions.length} 
        onRetry={handleRetry}
      />
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Question {currentQuestionIndex + 1} <span className="text-gray-500 text-sm font-normal">/ {questions.length}</span>
          </h2>
          <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <Timer duration={timeLimit} onTimeUp={handleTimeUp} />
      </div>

      {/* Question Card */}
      <div className="mb-8">
        <QuestionCard
          question={currentQuestion}
          selectedOption={selectedAnswers[currentQuestionIndex]}
          onSelectOption={handleOptionSelect}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={selectedAnswers[currentQuestionIndex] === null}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            selectedAnswers[currentQuestionIndex] !== null
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default QuizPlayer;
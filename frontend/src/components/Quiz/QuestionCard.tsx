import React from 'react';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // index of correct option
}

interface QuestionCardProps {
  question: Question;
  selectedOption: number | null;
  onSelectOption: (index: number) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        {question.text}
      </h3>
      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onSelectOption(index)}
            className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
              selectedOption === index
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${
                  selectedOption === index
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-400 text-gray-400'
                }`}
              >
                {selectedOption === index && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuestionCard;
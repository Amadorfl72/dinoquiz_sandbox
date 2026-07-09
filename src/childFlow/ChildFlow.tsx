import React, { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { QuizScreen, QuizFeedback } from './screens/QuizScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { useNavigationGuard } from './navigation/useNavigationGuard';
import { sampleQuestions, SampleQuestion } from './data/sampleQuestions';

type Screen = 'home' | 'quiz' | 'results';

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function starsForScore(score: number, totalQuestions: number): 1 | 2 | 3 {
  const ratio = totalQuestions > 0 ? score / totalQuestions : 0;
  if (ratio >= 0.7) {
    return 3;
  }
  if (ratio >= 0.4) {
    return 2;
  }
  return 1;
}

export function ChildFlow() {
  useNavigationGuard();

  const [screen, setScreen] = useState<Screen>('home');
  const [isMuted, setIsMuted] = useState(false);
  const [questions, setQuestions] = useState<SampleQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);

  const onToggleMute = () => setIsMuted((previous) => !previous);

  const startNewGame = () => {
    setQuestions(shuffle(sampleQuestions));
    setQuestionIndex(0);
    setScore(0);
    setFeedback(null);
    setScreen('quiz');
  };

  const currentQuestion = questions[questionIndex];

  const onSelectOption = (optionId: string) => {
    if (!currentQuestion || feedback) {
      return;
    }
    const isCorrect = optionId === currentQuestion.correctOptionId;
    setFeedback({ isCorrect, funFact: currentQuestion.funFact });
    if (isCorrect) {
      setScore((previous) => previous + 1);
    }
  };

  const onNext = () => {
    setFeedback(null);
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((previous) => previous + 1);
    } else {
      setScreen('results');
    }
  };

  if (screen === 'home') {
    return (
      <HomeScreen
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onPlay={startNewGame}
        onOpenPrivacyPolicy={() => {}}
        onOpenRemoveAds={() => {}}
      />
    );
  }

  if (screen === 'quiz' && currentQuestion) {
    return (
      <QuizScreen
        questionNumber={questionIndex + 1}
        totalQuestions={questions.length}
        prompt={currentQuestion.prompt}
        dinosaurImageAlt={currentQuestion.dinosaurName}
        dinosaurImageSrc={currentQuestion.dinosaurImageSrc}
        options={currentQuestion.options}
        onSelectOption={onSelectOption}
        feedback={feedback}
        onNext={onNext}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />
    );
  }

  return (
    <ResultsScreen
      score={score}
      totalQuestions={questions.length}
      stars={starsForScore(score, questions.length)}
      motivationalMessage="¡Lo has hecho genial! Sigue aprendiendo sobre dinosaurios."
      onPlayAgain={startNewGame}
      onExitToHome={() => setScreen('home')}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
    />
  );
}

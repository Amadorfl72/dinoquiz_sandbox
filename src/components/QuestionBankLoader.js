import Logger from '../utils/logger';
import Metrics from '../utils/metrics';

export const loadQuestionBank = async () => {
  try {
    const response = await fetch('/data/questions.json');
    const data = await response.json();
    
    // Validate question bank
    const isValid = validateQuestionBank(data);
    Logger.logBankValidation(isValid);
    
    if (!isValid) {
      throw new Error('Invalid question bank format');
    }
    
    return data;
  } catch (error) {
    Logger.logBankValidation(false, error.message);
    throw error;
  }
};

const validateQuestionBank = (bank) => {
  if (!Array.isArray(bank) || bank.length < 10) return false;
  
  return bank.every(question => {
    return (
      question.id &&
      question.text &&
      question.options &&
      question.options.length >= 3 &&
      question.correctAnswer !== undefined &&
      question.funFact
    );
  });
};
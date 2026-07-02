import { mount } from '@vue/test-utils';
import QuizQuestion from '../QuizQuestion.vue';

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const mockQuestion = {
    text: 'What is 2+2?',
    options: ['3', '4', '5'],
    correctIndex: 1,
    funFact: '4 is an even number.',
    image: '',
    altText: ''
  };

  it('highlights correct option and shows gentle message when incorrect answer is selected', async () => {
    const wrapper = mount(QuizQuestion, {
      props: {
        question: mockQuestion,
        correctFeedback: 'Correct!',
        incorrectFeedback: 'Good try! The correct answer is:'
      }
    });

    // Select incorrect option
    await wrapper.findAll('button')[0].trigger('click');

    // Verify correct option is highlighted
    const correctButton = wrapper.findAll('button')[1];
    expect(correctButton.classes()).toContain('correct');
    
    // Verify incorrect feedback message shows correct answer
    expect(wrapper.text()).toContain('Good try! The correct answer is: 4');
    
    // Verify fun fact is shown
    expect(wrapper.text()).toContain('4 is an even number.');
  });

  it('does not subtract score when incorrect answer is selected', async () => {
    const wrapper = mount(QuizQuestion, {
      props: {
        question: mockQuestion
      }
    });

    // Mock answer-selected event handler
    const answerSelectedHandler = jest.fn();
    wrapper.vm.$emit = answerSelectedHandler;
    
    // Select incorrect option
    await wrapper.findAll('button')[0].trigger('click');
    
    // Verify false is emitted (not correct)
    expect(answerSelectedHandler).toHaveBeenCalledWith(false);
    
    // Note: Score handling is tested in Quiz.vue tests
  });
});
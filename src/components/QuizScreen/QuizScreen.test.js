import { mount } from '@vue/test-utils';
import QuizQuestion from '../QuizQuestion.vue';
import Quiz from '../Quiz.vue';

describe('TRIOFSND-19: Implement Incorrect Answer Feedback', () => {
  const mockQuestion = {
    text: 'What is 2+2?',
    options: ['3', '4', '5'],
    correctIndex: 1,
    funFact: '4 is an even number.',
    image: '',
    altText: ''
  };

  describe('QuizQuestion', () => {
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

    it('marks the selected incorrect option with incorrect class', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[0].trigger('click');

      const selectedButton = wrapper.findAll('button')[0];
      expect(selectedButton.classes()).toContain('incorrect');
    });

    it('does not mark the correct option as incorrect', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[0].trigger('click');

      const correctButton = wrapper.findAll('button')[1];
      expect(correctButton.classes()).not.toContain('incorrect');
    });

    it('shows the feedback panel (fun fact screen) after selecting an incorrect answer', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      expect(wrapper.find('.feedback').exists()).toBe(false);

      await wrapper.findAll('button')[0].trigger('click');

      expect(wrapper.find('.feedback').exists()).toBe(true);
      expect(wrapper.find('.fun-fact').exists()).toBe(true);
    });

    it('emits answer-selected with false when incorrect answer is selected', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[0].trigger('click');

      expect(wrapper.emitted('answer-selected')).toBeTruthy();
      expect(wrapper.emitted('answer-selected')[0]).toEqual([false]);
    });

    it('emits answer-selected with true when correct answer is selected', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[1].trigger('click');

      expect(wrapper.emitted('answer-selected')).toBeTruthy();
      expect(wrapper.emitted('answer-selected')[0]).toEqual([true]);
    });

    it('does not highlight correct option when the answer is correct', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[1].trigger('click');

      const correctButton = wrapper.findAll('button')[1];
      expect(correctButton.classes()).not.toContain('correct');
      expect(correctButton.classes()).not.toContain('incorrect');
    });

    it('shows correct feedback text when the answer is correct', async () => {
      const wrapper = mount(QuizQuestion, {
        props: {
          question: mockQuestion,
          correctFeedback: '¡Correcto!',
          incorrectFeedback: '¡Casi! La respuesta correcta es:'
        }
      });

      await wrapper.findAll('button')[1].trigger('click');

      expect(wrapper.text()).toContain('¡Correcto!');
      expect(wrapper.text()).toContain('4 is an even number.');
    });

    it('uses default feedback strings when none are provided', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[0].trigger('click');

      expect(wrapper.text()).toContain('¡Casi! La respuesta correcta es: 4');
    });

    it('prevents selecting another option after feedback is shown', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[0].trigger('click');
      await wrapper.findAll('button')[1].trigger('click');

      // Only one answer-selected event should have been emitted
      expect(wrapper.emitted('answer-selected').length).toBe(1);
    });

    it('emits next-question when the Siguiente button is clicked', async () => {
      const wrapper = mount(QuizQuestion, {
        props: { question: mockQuestion }
      });

      await wrapper.findAll('button')[0].trigger('click');
      await wrapper.find('.feedback button').trigger('click');

      expect(wrapper.emitted('next-question')).toBeTruthy();
    });
  });

  describe('Quiz score handling', () => {
    const questions = [
      { ...mockQuestion },
      {
        text: 'What is 3+3?',
        options: ['5', '6', '7'],
        correctIndex: 1,
        funFact: '6 is an even number.',
        image: '',
        altText: ''
      }
    ];

    it('does not subtract score when an incorrect answer is selected', async () => {
      const wrapper = mount(Quiz, {
        props: { questions }
      });

      expect(wrapper.vm.score).toBe(0);

      // Select incorrect option
      await wrapper.findAll('button')[0].trigger('click');
      await wrapper.find('.feedback button').trigger('click');

      expect(wrapper.vm.score).toBe(0);
    });

    it('increments score only when a correct answer is selected', async () => {
      const wrapper = mount(Quiz, {
        props: { questions }
      });

      expect(wrapper.vm.score).toBe(0);

      // Select correct option
      await wrapper.findAll('button')[1].trigger('click');
      await wrapper.find('.feedback button').trigger('click');

      expect(wrapper.vm.score).toBe(1);
    });

    it('keeps score unchanged across a mix of correct and incorrect answers', async () => {
      const wrapper = mount(Quiz, {
        props: { questions }
      });

      // First question: incorrect
      await wrapper.findAll('button')[0].trigger('click');
      await wrapper.find('.feedback button').trigger('click');
      expect(wrapper.vm.score).toBe(0);

      // Second question: correct
      await wrapper.findAll('button')[1].trigger('click');
      await wrapper.find('.feedback button').trigger('click');
      expect(wrapper.vm.score).toBe(1);
    });

    it('emits quiz-completed with the final score after the last question', async () => {
      const wrapper = mount(Quiz, {
        props: { questions }
      });

      // First question: correct
      await wrapper.findAll('button')[1].trigger('click');
      await wrapper.find('.feedback button').trigger('click');

      // Second question: incorrect
      await wrapper.findAll('button')[0].trigger('click');
      await wrapper.find('.feedback button').trigger('click');

      expect(wrapper.emitted('quiz-completed')).toBeTruthy();
      expect(wrapper.emitted('quiz-completed')[0]).toEqual([1]);
    });
  });
});

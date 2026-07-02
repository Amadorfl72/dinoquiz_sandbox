import { mount } from '@vue/test-utils';
import QuizQuestion from '@/components/QuizQuestion.vue';
import { useAnimation } from '@/hooks/useAnimation';
import { playSound } from '@/utils/SoundManager';

// Mocking dependencies
jest.mock('@/utils/SoundManager', () => ({
  playSound: jest.fn(),
}));

jest.mock('@/hooks/useAnimation', () => ({
  useAnimation: jest.fn(),
}));

describe('TRIOFSND-18: Implement Correct Answer Feedback', () => {
  let mockTriggerAnimation;
  const baseQuestion = {
    text: 'Test question',
    options: ['Option 1', 'Option 2'],
    correctAnswer: 'Option 1',
    funFact: 'Test fun fact',
    image: 'test.jpg'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockTriggerAnimation = jest.fn();
    useAnimation.mockReturnValue({ triggerAnimation: mockTriggerAnimation });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mountComponent = (question = baseQuestion) => {
    return mount(QuizQuestion, {
      props: { question }
    });
  };

  it('plays a happy sound effect when the correct option is tapped', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');

    expect(playSound).toHaveBeenCalledWith('happy_sound');
  });

  it('shows a positive animation when the correct option is tapped', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');

    expect(mockTriggerAnimation).toHaveBeenCalledWith('positive_animation');
  });

  it('shows feedback with the fun fact when the correct option is tapped', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');

    expect(wrapper.vm.showFeedback).toBe(true);
    expect(wrapper.vm.showAnimation).toBe(true);
    expect(wrapper.vm.feedbackMessage).toBe('¡Correcto! ' + baseQuestion.funFact);
    expect(wrapper.find('.feedback').exists()).toBe(true);
    expect(wrapper.find('.animation-container').exists()).toBe(true);
  });

  it('emits show-fun-fact event with the fun fact after 4 seconds', async () => {
    const wrapper = mountComponent();

    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('show-fun-fact')).toBeFalsy();

    jest.advanceTimersByTime(4000);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('show-fun-fact')).toBeTruthy();
    expect(wrapper.emitted('show-fun-fact')[0]).toEqual([baseQuestion.funFact]);
  });

  it('does not play the happy sound or trigger animation for an incorrect answer', async () => {
    const wrapper = mountComponent();

    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');

    expect(playSound).toHaveBeenCalledWith('neutral_sound');
    expect(playSound).not.toHaveBeenCalledWith('happy_sound');
    expect(mockTriggerAnimation).not.toHaveBeenCalledWith('positive_animation');
    expect(wrapper.vm.showAnimation).toBe(false);
    expect(wrapper.emitted('show-fun-fact')).toBeFalsy();
  });
});

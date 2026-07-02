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
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerAnimation = jest.fn();
    useAnimation.mockReturnValue({ triggerAnimation: mockTriggerAnimation });
  });

  it('plays a happy sound effect when the correct option is tapped', async () => {
    const question = {
      text: 'Test question',
      options: ['Option 1', 'Option 2'],
      correctAnswer: 'Option 1',
      funFact: 'Test fun fact',
      image: 'test.jpg'
    };
    
    const wrapper = mount(QuizQuestion, {
      props: { question }
    });
    
    await wrapper.find('button').trigger('click');
    
    expect(playSound).toHaveBeenCalledWith('happy_sound');
  });

  it('shows a positive animation when the correct option is tapped', async () => {
    const question = {
      text: 'Test question',
      options: ['Option 1', 'Option 2'],
      correctAnswer: 'Option 1',
      funFact: 'Test fun fact',
      image: 'test.jpg'
    };
    
    const wrapper = mount(QuizQuestion, {
      props: { question }
    });
    
    await wrapper.find('button').trigger('click');
    
    expect(mockTriggerAnimation).toHaveBeenCalledWith('positive_animation');
  });

  it('emits show-fun-fact event when the correct option is tapped', async () => {
    const question = {
      text: 'Test question',
      options: ['Option 1', 'Option 2'],
      correctAnswer: 'Option 1',
      funFact: 'Test fun fact',
      image: 'test.jpg'
    };
    
    const wrapper = mount(QuizQuestion, {
      props: { question }
    });
    
    await wrapper.find('button').trigger('click');
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    expect(wrapper.emitted('show-fun-fact')).toBeTruthy();
    expect(wrapper.emitted('show-fun-fact')[0]).toEqual([question.funFact]);
  });
});
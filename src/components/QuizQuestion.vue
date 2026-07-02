<template>
  <div class="quiz-question">
    <h2>{{ question.text }}</h2>
    <img :src="question.image" alt="Dinosaur image" />
    <div class="options">
      <button
        v-for="(option, index) in question.options"
        :key="index"
        @click="handleAnswer(option)"
      >
        {{ option }}
      </button>
    </div>
    <transition name="fade">
      <div v-if="showFeedback" class="feedback">
        <p>{{ feedbackMessage }}</p>
        <div v-if="showAnimation" class="animation-container">
          <!-- Animation will be triggered here -->
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useAnimation } from '@/hooks/useAnimation';
import { playSound } from '@/utils/SoundManager';

export default {
  props: {
    question: {
      type: Object,
      required: true
    }
  },
  setup() {
    const { triggerAnimation } = useAnimation();
    return { triggerAnimation };
  },
  data() {
    return {
      showFeedback: false,
      feedbackMessage: '',
      showAnimation: false
    };
  },
  methods: {
    async handleAnswer(option) {
      if (option === this.question.correctAnswer) {
        this.feedbackMessage = '¡Correcto! ' + this.question.funFact;
        await playSound('happy_sound');
        this.showFeedback = true;
        this.showAnimation = true;
        this.triggerAnimation('positive_animation');
        setTimeout(() => {
          this.$emit('show-fun-fact', this.question.funFact);
        }, 4000); // Transition after 4 seconds
      } else {
        this.feedbackMessage = 'La respuesta correcta es: ' + this.question.correctAnswer;
        playSound('neutral_sound');
        this.showFeedback = true;
      }
    }
  }
};
</script>

<style scoped>
.quiz-question {
  text-align: center;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.feedback {
  margin-top: 20px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
.animation-container {
  margin-top: 20px;
  height: 100px;
}
</style>
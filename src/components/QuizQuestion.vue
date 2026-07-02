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
        <audio ref="feedbackAudio" :src="feedbackSound" autoplay></audio>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  props: {
    question: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      showFeedback: false,
      feedbackMessage: '',
      feedbackSound: ''
    };
  },
  methods: {
    handleAnswer(option) {
      if (option === this.question.correctAnswer) {
        this.feedbackMessage = '¡Correcto! ' + this.question.funFact;
        this.feedbackSound = require('@/assets/sounds/happy.mp3');
        this.showFeedback = true;
        setTimeout(() => {
          this.$emit('next-question');
        }, 4000); // Transition after 4 seconds
      } else {
        this.feedbackMessage = 'La respuesta correcta es: ' + this.question.correctAnswer;
        this.feedbackSound = require('@/assets/sounds/neutral.mp3');
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
</style>
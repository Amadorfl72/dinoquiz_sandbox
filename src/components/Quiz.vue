<template>
  <div class="quiz">
    <QuizQuestion
      v-if="currentQuestion"
      :question="currentQuestion"
      :correct-feedback="strings.correctFeedback"
      :incorrect-feedback="strings.incorrectFeedback"
      @answer-selected="handleAnswer"
      @next-question="nextQuestion"
    />
  </div>
</template>

<script>
import QuizQuestion from './QuizQuestion.vue';
import strings from '../assets/strings.json';

export default {
  components: { QuizQuestion },
  props: {
    questions: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      currentQuestionIndex: 0,
      score: 0,
      strings
    };
  },
  computed: {
    currentQuestion() {
      return this.questions[this.currentQuestionIndex];
    }
  },
  methods: {
    handleAnswer(isCorrect) {
      if (isCorrect) {
        this.score++;
      }
      // Explicitly ensure no score deduction for incorrect answers
    },
    nextQuestion() {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
      } else {
        this.$emit('quiz-completed', this.score);
      }
    }
  }
};
</script>

<style scoped>
.quiz {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
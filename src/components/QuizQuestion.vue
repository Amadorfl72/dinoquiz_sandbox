<template>
  <div class="quiz-question">
    <h2>{{ question.text }}</h2>
    <img :src="question.image" :alt="question.altText" />
    <div class="options">
      <button
        v-for="(option, index) in question.options"
        :key="index"
        @click="selectOption(index)"
        :class="{
          'correct': showCorrectAnswer && index === question.correctIndex,
          'incorrect': showIncorrectFeedback && selectedOption === index && index !== question.correctIndex
        }"
      >
        {{ option }}
      </button>
    </div>
    <div v-if="showFeedback" class="feedback">
      <p v-if="isCorrect">{{ correctFeedback }}</p>
      <p v-else>{{ incorrectFeedback }} {{ question.options[question.correctIndex] }}</p>
      <p class="fun-fact">{{ question.funFact }}</p>
      <button @click="nextQuestion">Siguiente</button>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  props: {
    question: {
      type: Object,
      required: true
    },
    correctFeedback: {
      type: String,
      default: '¡Correcto!'
    },
    incorrectFeedback: {
      type: String,
      default: '¡Casi! La respuesta correcta es:'
    }
  },
  setup(props, { emit }) {
    const selectedOption = ref(null);
    const isCorrect = ref(false);
    const showFeedback = ref(false);
    const showCorrectAnswer = ref(false);
    const showIncorrectFeedback = ref(false);

    const selectOption = (index) => {
      if (showFeedback.value) return;

      selectedOption.value = index;
      isCorrect.value = index === props.question.correctIndex;
      showFeedback.value = true;
      showCorrectAnswer.value = !isCorrect.value;
      showIncorrectFeedback.value = !isCorrect.value;

      emit('answer-selected', isCorrect.value);
    };

    const nextQuestion = () => {
      emit('next-question');
    };

    return {
      selectedOption,
      isCorrect,
      showFeedback,
      showCorrectAnswer,
      showIncorrectFeedback,
      selectOption,
      nextQuestion
    };
  }
};
</script>

<style scoped>
.quiz-question {
  text-align: center;
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 20px 0;
}

button {
  padding: 12px;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}

button.correct {
  background-color: #4CAF50;
  animation: pulse 0.5s;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.8);
}

button.incorrect {
  background-color: #f44336;
}

.feedback {
  margin-top: 20px;
}

.fun-fact {
  font-style: italic;
  margin: 10px 0;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>
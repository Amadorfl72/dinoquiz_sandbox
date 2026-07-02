import React from 'react';
import JugarButton from '../components/JugarButton';

const Home = () => (
  <div style={styles.container}>
    <h1>DinoQuiz</h1>
    <JugarButton />
  </div>
);

const styles = {
  container: {
    textAlign: 'center',
    padding: '20px',
  },
};

export default Home;
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import PropTypes from 'prop-types';

const OptionButton = ({ option, onPress, isCorrect }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  
  const DEBOUNCE_TIME = 500; // 500ms debounce time

  const handlePress = () => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      setDebounceTimeout(null);
      return;
    }
    
    setIsPressed(true);
    onPress(option, isCorrect);
    
    const timeout = setTimeout(() => {
      setIsPressed(false);
      setDebounceTimeout(null);
    }, DEBOUNCE_TIME);
    
    setDebounceTimeout(timeout);
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return (
    <TouchableOpacity 
      onPress={handlePress}
      disabled={isPressed}
      style={[
        styles.button,
        isPressed && styles.pressedButton
      ]}
    >
      <Text style={styles.optionText}>{option}</Text>
    </TouchableOpacity>
  );
};

OptionButton.propTypes = {
  option: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  isCorrect: PropTypes.bool.isRequired
};

const styles = {
  button: {
    padding: 15,
    margin: 5,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center'
  },
  pressedButton: {
    opacity: 0.7,
    backgroundColor: '#388E3C'
  },
  optionText: {
    color: 'white',
    fontSize: 18
  }
};

export default OptionButton;
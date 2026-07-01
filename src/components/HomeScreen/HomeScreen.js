import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { logAnalyticsEvent } from '../../utils/analytics';
import { getAppOpenTime } from '../../utils/appTiming';
import styles from './styles';

export default function HomeScreen() {
  const navigation = useNavigation();

  const handleJugarPress = () => {
    const timeSinceAppOpen = Date.now() - getAppOpenTime();
    logAnalyticsEvent('first_tap_jugar', { timestamp: timeSinceAppOpen });
    navigation.navigate('Game');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.jugarButton}
        onPress={handleJugarPress}
        accessibilityLabel="¡Jugar!"
        accessibilityRole="button"
      >
        <Text style={styles.jugarButtonText}>¡Jugar!</Text>
      </TouchableOpacity>
    </View>
  );
}
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import QuestionScreen from '../screens/QuestionScreen';
import FunFactScreen from '../components/FunFactScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Question" component={QuestionScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="FunFact" 
        component={FunFactScreen} 
        options={{ 
          headerShown: false,
          gestureEnabled: false, // Prevent swiping back
        }} 
      />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
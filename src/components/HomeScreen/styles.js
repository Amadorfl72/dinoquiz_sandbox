import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jugarButton: {
    minHeight: 64,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
  },
  jugarButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});

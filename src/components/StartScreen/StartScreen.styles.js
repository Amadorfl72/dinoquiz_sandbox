import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 20,
  },
  dinosaurImage: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  playButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    minHeight: 64,
    justifyContent: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

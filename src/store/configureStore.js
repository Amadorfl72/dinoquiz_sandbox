import { createStore, applyMiddleware } from 'redux';
import rootReducer from '../reducers';
import { analyticsMiddleware } from '../analytics';

const configureStore = (preloadedState) => {
  const store = createStore(
    rootReducer,
    preloadedState,
    applyMiddleware(analyticsMiddleware)
  );

  return store;
};

export default configureStore;

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { trackLCP, trackJSErrors } from './utils/metrics';

// Initialize observability metrics
trackLCP();
trackJSErrors();

ReactDOM.render(<App />, document.getElementById('root'));
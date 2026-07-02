// Dashboard for displaying metrics
import { calculateMetrics } from './metrics';

class AnalyticsDashboard {
  constructor(logs) {
    this.logs = logs;
    this.metrics = calculateMetrics(logs);
  }

  displayMetrics() {
    console.log('Average Success Ratio per Question:', this.metrics.successRatios);
    console.log('Time to Answer Distribution:', this.metrics.timeDistributions);
    console.log('Top 5 Worst Performing Questions:', this.metrics.worstQuestions);
  }
}

export default AnalyticsDashboard;
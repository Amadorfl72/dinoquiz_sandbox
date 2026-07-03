class MetricsAggregator:
    def __init__(self):
        self.logs = []
        self.question_stats = {}

    def ingest(self, log_entry):
        if log_entry.get("event_type") not in ["question_answered", "feedback_shown"]:
            raise ValueError("Invalid event type")
        self.logs.append(log_entry)
        
        if log_entry["event_type"] == "question_answered":
            qid = log_entry["question_id"]
            if qid not in self.question_stats:
                self.question_stats[qid] = {"success": 0, "total": 0, "times": []}
            self.question_stats[qid]["total"] += 1
            if log_entry["success"]:
                self.question_stats[qid]["success"] += 1
            self.question_stats[qid]["times"].append(log_entry["time_to_answer_ms"])

    def get_average_success_ratio(self):
        return {qid: stats["success"] / stats["total"] for qid, stats in self.question_stats.items()}

    def get_time_to_answer_distribution(self):
        all_times = []
        for stats in self.question_stats.values():
            all_times.extend(stats["times"])
        if not all_times:
            return {}
        all_times.sort()
        return {
            "min": min(all_times),
            "max": max(all_times),
            "avg": sum(all_times) / len(all_times),
            "count": len(all_times)
        }

    def get_top_5_worst_questions(self):
        ratios = self.get_average_success_ratio()
        sorted_qs = sorted(ratios.items(), key=lambda item: (item[1], item[0]))
        return [{"question_id": q[0], "success_ratio": q[1]} for q in sorted_qs[:5]]

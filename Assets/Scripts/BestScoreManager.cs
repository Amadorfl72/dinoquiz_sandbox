using System;

public interface ISafeScoreStorage
{
    int GetBestScore();
    void SetBestScore(int score);
}

public class BestScoreManager
{
    private readonly ISafeScoreStorage _storage;
    
    public event Action<int> OnNewBestScore;
    
    public BestScoreManager(ISafeScoreStorage storage)
    {
        _storage = storage;
    }
    
    public void HandleGameCompletion(int newScore)
    {
        // Guard against negative scores
        if (newScore < 0)
            return;
            
        int currentBest = _storage.GetBestScore();
        
        // Only update if new score is greater than current best
        if (newScore > currentBest)
        {
            _storage.SetBestScore(newScore);
            OnNewBestScore?.Invoke(newScore);
        }
    }
}
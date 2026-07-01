using System;
using NSubstitute;
using NUnit.Framework;

namespace Tests.PlayMode
{
    [TestFixture]
    public class BestScoreManagerTests
    {
        private ISafeScoreStorage _storage;
        private BestScoreManager _manager;

        [SetUp]
        public void SetUp()
        {
            _storage = Substitute.For<ISafeScoreStorage>();
            _manager = new BestScoreManager(_storage);
        }

        [Test]
        public void OnGameCompletion_NewScoreGreaterThanBest_UpdatesStorageAndTriggersEvent()
        {
            _storage.GetBestScore().Returns(100);
            int? eventScore = null;
            _manager.OnNewBestScore += score => eventScore = score;

            _manager.HandleGameCompletion(150);

            _storage.Received(1).SetBestScore(150);
            Assert.IsTrue(eventScore.HasValue);
            Assert.AreEqual(150, eventScore.Value);
        }

        [Test]
        public void OnGameCompletion_NewScoreEqualToBest_DoesNotUpdateOrTriggerEvent()
        {
            _storage.GetBestScore().Returns(100);
            bool eventTriggered = false;
            _manager.OnNewBestScore += score => eventTriggered = true;

            _manager.HandleGameCompletion(100);

            _storage.DidNotReceive().SetBestScore(Arg.Any<int>());
            Assert.IsFalse(eventTriggered);
        }

        [Test]
        public void OnGameCompletion_NewScoreLowerThanBest_DoesNotUpdateOrTriggerEvent()
        {
            _storage.GetBestScore().Returns(100);
            bool eventTriggered = false;
            _manager.OnNewBestScore += score => eventTriggered = true;

            _manager.HandleGameCompletion(50);

            _storage.DidNotReceive().SetBestScore(Arg.Any<int>());
            Assert.IsFalse(eventTriggered);
        }

        [Test]
        public void OnGameCompletion_FirstTimeBestZero_NewScorePositive_UpdatesAndTriggers()
        {
            _storage.GetBestScore().Returns(0);
            int? eventScore = null;
            _manager.OnNewBestScore += score => eventScore = score;

            _manager.HandleGameCompletion(10);

            _storage.Received(1).SetBestScore(10);
            Assert.AreEqual(10, eventScore);
        }

        [Test]
        public void OnGameCompletion_NewScoreGreaterThanBest_TriggersEventExactlyOnce()
        {
            _storage.GetBestScore().Returns(50);
            int triggerCount = 0;
            _manager.OnNewBestScore += score => triggerCount++;

            _manager.HandleGameCompletion(75);

            Assert.AreEqual(1, triggerCount);
        }

        [Test]
        public void OnGameCompletion_NegativeNewScoreLowerThanZeroBest_DoesNotUpdateOrTrigger()
        {
            _storage.GetBestScore().Returns(0);
            bool eventTriggered = false;
            _manager.OnNewBestScore += score => eventTriggered = true;

            _manager.HandleGameCompletion(-5);

            _storage.DidNotReceive().SetBestScore(Arg.Any<int>());
            Assert.IsFalse(eventTriggered);
        }
    }
}
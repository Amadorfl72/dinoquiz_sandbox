package com.triofsnd

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.ViewAssertion
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenUITest {

    @Test
    fun displaysQuestionStatement() {
        ActivityScenario.launch(QuestionActivity::class.java)
        onView(withId(R.id.question_text)).check(matches(isDisplayed()))
    }

    @Test
    fun displaysDinosaurIllustration() {
        ActivityScenario.launch(QuestionActivity::class.java)
        onView(withId(R.id.dinosaur_image)).check(matches(isDisplayed()))
    }

    @Test
    fun displaysExactlyThreeButtons() {
        ActivityScenario.launch(QuestionActivity::class.java)
        onView(withId(R.id.option_button_1)).check(matches(isDisplayed()))
        onView(withId(R.id.option_button_2)).check(matches(isDisplayed()))
        onView(withId(R.id.option_button_3)).check(matches(isDisplayed()))
    }

    @Test
    fun buttonsAreLargeEnough() {
        ActivityScenario.launch(QuestionActivity::class.java)
        val minHeightAssertion = ViewAssertion { view, noViewFoundException ->
            assertNotNull(view)
            val expectedMinHeight = (48 * view.resources.displayMetrics.density).toInt()
            assertTrue("Button height is less than 48dp", view.height >= expectedMinHeight)
        }

        onView(withId(R.id.option_button_1)).check(minHeightAssertion)
        onView(withId(R.id.option_button_2)).check(minHeightAssertion)
        onView(withId(R.id.option_button_3)).check(minHeightAssertion)
    }

    @Test
    fun doesNotDisplayTimerOrCountdown() {
        ActivityScenario.launch(QuestionActivity::class.java)
        onView(withId(R.id.timer_text)).check(doesNotExist())
        onView(withId(R.id.countdown_text)).check(doesNotExist())
    }
}

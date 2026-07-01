import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.doesNotExist
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun displaysQuestionStatement() {
        onView(withId(R.id.questionStatement)).check(matches(isDisplayed()))
    }

    @Test
    fun displaysDinosaurIllustration() {
        onView(withId(R.id.dinosaurIllustration)).check(matches(isDisplayed()))
    }

    @Test
    fun displaysExactlyThreeAnswerButtons() {
        onView(withId(R.id.answerButton1)).check(matches(isDisplayed()))
        onView(withId(R.id.answerButton2)).check(matches(isDisplayed()))
        onView(withId(R.id.answerButton3)).check(matches(isDisplayed()))
    }

    @Test
    fun answerButtonsAreLargeAndTouchable() {
        onView(withId(R.id.answerButton1)).check { view, _ ->
            val density = view.resources.displayMetrics.density
            val minSizePx = (48 * density).toInt()
            assert(view.height >= minSizePx) { "Button 1 height is less than 48dp" }
            assert(view.isClickable) { "Button 1 is not clickable" }
        }
        onView(withId(R.id.answerButton2)).check { view, _ ->
            val density = view.resources.displayMetrics.density
            val minSizePx = (48 * density).toInt()
            assert(view.height >= minSizePx) { "Button 2 height is less than 48dp" }
            assert(view.isClickable) { "Button 2 is not clickable" }
        }
        onView(withId(R.id.answerButton3)).check { view, _ ->
            val density = view.resources.displayMetrics.density
            val minSizePx = (48 * density).toInt()
            assert(view.height >= minSizePx) { "Button 3 height is less than 48dp" }
            assert(view.isClickable) { "Button 3 is not clickable" }
        }
    }

    @Test
    fun doesNotDisplayTimerOrCountdown() {
        onView(withId(R.id.timer)).check(doesNotExist())
        onView(withId(R.id.countdown)).check(doesNotExist())
    }
}
package com.dinoquiz

import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenTest {

    @Test
    fun title_isDisplayed() {
        ActivityScenario.launch(StartActivity::class.java)
        onView(withText("DinoQuiz")).check(matches(isDisplayed()))
    }

    @Test
    fun dinosaurIllustration_isDisplayed() {
        ActivityScenario.launch(StartActivity::class.java)
        // Assuming the dinosaur illustration has a content description for accessibility
        onView(withContentDescription("dinosaur_illustration")).check(matches(isDisplayed()))
    }

    @Test
    fun playButton_isDisplayedWithCorrectText() {
        ActivityScenario.launch(StartActivity::class.java)
        onView(withText("¡Jugar!")).check(matches(isDisplayed()))
    }

    @Test
    fun playButton_hasMinimumHeight64dp() {
        ActivityScenario.launch(StartActivity::class.java)
        onView(withText("¡Jugar!")).check(matches(withMinHeight(64)))
    }

    @Test
    fun startScreen_rendersWithin3Seconds() {
        val startTime = System.currentTimeMillis()
        ActivityScenario.launch(StartActivity::class.java)
        
        // Wait for the main title to be displayed, indicating the screen has rendered
        onView(withText("DinoQuiz")).check(matches(isDisplayed()))
        
        val endTime = System.currentTimeMillis()
        val renderTime = endTime - startTime
        
        assertTrue("Screen should render in <3s, but took ${renderTime}ms", renderTime < 3000)
    }

    // Custom matcher to check if a view's height is at least the specified dp value
    private fun withMinHeight(minHeightDp: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("with min height: $minHeightDp dp")
            }

            override fun matchesSafely(view: View): Boolean {
                val density = view.resources.displayMetrics.density
                val actualHeightDp = view.height / density
                return actualHeightDp >= minHeightDp
            }
        }
    }
}
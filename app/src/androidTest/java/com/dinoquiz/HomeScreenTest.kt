package com.dinoquiz

import android.view.View
import android.widget.TextView
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(HomeActivity::class.java)

    private fun dpToPx(dp: Int): Int {
        val density = InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
        return (dp * density).toInt()
    }

    private fun withMinHeight(minHeightPx: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("view height >= $minHeightPx px")
            }
            override fun matchesSafely(view: View): Boolean {
                return view.height >= minHeightPx
            }
        }
    }

    private fun withMinWidth(minWidthPx: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("view width >= $minWidthPx px")
            }
            override fun matchesSafely(view: View): Boolean {
                return view.width >= minWidthPx
            }
        }
    }

    private fun withMinTextSize(minSp: Float): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("text size >= $minSp sp")
            }
            override fun matchesSafely(view: View): Boolean {
                if (view is TextView) {
                    return view.textSize >= minSp * view.resources.displayMetrics.scaledDensity
                }
                return false
            }
        }
    }

    @Test
    fun testHomeScreenElementsAreDisplayed() {
        onView(withText("DinoQuiz")).check(matches(isDisplayed()))
        onView(withContentDescription("Dinosaur mascot")).check(matches(isDisplayed()))
        onView(withText("¡Jugar!")).check(matches(isDisplayed()))
    }

    @Test
    fun testPlayButtonAccessibility() {
        val playButton = onView(withText("¡Jugar!"))
        
        // Keyboard navigable
        playButton.check(matches(isFocusable()))
        playButton.check(matches(isClickable()))
        
        // ARIA labels (Content Description in Android)
        playButton.check(matches(hasContentDescription()))
    }

    @Test
    fun testPlayButtonDimensions() {
        val playButton = onView(withText("¡Jugar!"))
        
        // Check height >= 64dp
        playButton.check(matches(withMinHeight(dpToPx(64))))
        
        // Check touch area >= 48x48dp
        playButton.check(matches(withMinWidth(dpToPx(48))))
        playButton.check(matches(withMinHeight(dpToPx(48))))
    }

    @Test
    fun testTextSizeAccessibility() {
        // Check text >= 24sp for title and button
        onView(withText("DinoQuiz")).check(matches(withMinTextSize(24f)))
        onView(withText("¡Jugar!")).check(matches(withMinTextSize(24f)))
    }
}

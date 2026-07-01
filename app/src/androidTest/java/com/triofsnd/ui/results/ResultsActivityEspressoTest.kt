package com.triofsnd.ui.results

import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsActivityEspressoTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(ResultsActivity::class.java)

    @Test
    fun volverAJugarButton_heightIsAtLeast48dp() {
        onView(withText("Volver a jugar"))
            .check(matches(isDisplayed()))
            .check(matches(hasMinimumHeightDp(48)))
    }

    private fun hasMinimumHeightDp(minDp: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("View height should be at least $minDp dp")
            }

            override fun matchesSafely(view: View): Boolean {
                val density = view.resources.displayMetrics.density
                val minHeightPx = minDp * density
                return view.height >= minHeightPx
            }
        }
    }
}
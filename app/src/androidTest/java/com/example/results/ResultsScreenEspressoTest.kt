package com.example.results

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenEspressoTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(ResultsActivity::class.java)

    @Test
    fun testVolverAJugarButtonHeight() {
        onView(withText("Volver a Jugar"))
            .check(matches(isDisplayed()))
            .check(matches(hasMinimumHeight(48)))
    }

    private fun hasMinimumHeight(minHeightDp: Int): TypeSafeMatcher<android.view.View> {
        return object : TypeSafeMatcher<android.view.View>() {
            override fun describeTo(description: Description) {
                description.appendText("with minimum height: $minHeightDp dp")
            }

            override fun matchesSafely(view: android.view.View): Boolean {
                val density = view.resources.displayMetrics.density
                val minHeightPx = (minHeightDp * density).toInt()
                return view.height >= minHeightPx
            }
        }
    }
}

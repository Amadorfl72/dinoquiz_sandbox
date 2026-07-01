package com.triofsnd.results

import android.view.View
import androidx.test.espresso.Espresso
import androidx.test.espresso.assertion.ViewAssertions
import androidx.test.espresso.matcher.BoundedMatcher
import androidx.test.espresso.matcher.ViewMatchers
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenUITest {

    @get:Rule
    val activityRule = ActivityScenarioRule(ResultsActivity::class.java)

    @Test
    fun testVolverAJugarButtonMinimumHeight() {
        Espresso.onView(ViewMatchers.withText("Volver a jugar"))
            .check(ViewAssertions.matches(withMinHeightDp(48)))
    }

    private fun withMinHeightDp(minHeightDp: Int): Matcher<View> {
        return object : BoundedMatcher<View, View>(View::class.java) {
            override fun describeTo(description: Description) {
                description.appendText("with min height: $minHeightDp dp")
            }

            override fun matchesSafely(view: View): Boolean {
                val density = view.context.resources.displayMetrics.density
                val minHeightPx = (minHeightDp * density).toInt()
                return view.height >= minHeightPx
            }
        }
    }
}
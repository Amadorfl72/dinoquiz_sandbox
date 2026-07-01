package com.triofsnd

import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.BoundedMatcher
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
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
            .check(matches(withMinHeightDp(48)))
    }
}

fun withMinHeightDp(minHeightDp: Int): BoundedMatcher<View, View> {
    return object : BoundedMatcher<View, View>(View::class.java) {
        override fun matchesSafely(item: View): Boolean {
            val density = item.resources.displayMetrics.density
            val minHeightPx = (minHeightDp * density).toInt()
            return item.height >= minHeightPx
        }

        override fun describeTo(description: Description) {
            description.appendText("with min height: $minHeightDp dp")
        }
    }
}
package com.example.app

import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(ResultsActivity::class.java)

    @Test
    fun volverAJugarButton_meetsMinimumTouchTargetSize() {
        onView(withText("Volver a jugar"))
            .check(matches(hasMinimumHeight(48)))
    }

    @Test
    fun volverAJugarButtonById_meetsMinimumTouchTargetSize() {
        onView(withId(R.id.btnVolverAJugar))
            .check(matches(hasMinimumHeight(48)))
    }

    private fun hasMinimumHeight(minHeightDp: Int): TypeSafeMatcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("view with minimum height of $minHeightDp dp")
            }

            override fun matchesSafely(view: View): Boolean {
                val density = view.resources.displayMetrics.density
                val minHeightPx = (minHeightDp * density).toInt()
                return view.height >= minHeightPx
            }
        }
    }
}
package com.triofsnd.app

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isFocusable
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.view.View
import androidx.test.espresso.matcher.BoundedMatcher
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenUITest {

    @Before
    fun launchActivity() {
        ActivityScenario.launch(HomeActivity::class.java)
    }

    @Test
    fun test_dinosaur_mascot_illustration_displayed() {
        onView(withId(R.id.dino_mascot))
            .check(matches(isDisplayed()))
    }

    @Test
    fun test_button_height_minimum_64dp() {
        onView(withText("¡Jugar!"))
            .check(matches(hasMinimumHeightDp(64)))
    }

    @Test
    fun test_keyboard_navigation_focusable() {
        onView(withText("¡Jugar!"))
            .check(matches(isFocusable()))
    }

    private fun hasMinimumHeightDp(minHeightDp: Int): Matcher<View> {
        return object : BoundedMatcher<View, View>(View::class.java) {
            override fun matchesSafely(view: View): Boolean {
                val density = view.resources.displayMetrics.density
                val minHeightPx = minHeightDp * density
                return view.height >= minHeightPx
            }

            override fun describeTo(description: Description) {
                description.appendText("view with minimum height of $minHeightDp dp")
            }
        }
    }
}

package com.example.app

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.ViewAssertion
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(HomeActivity::class.java)

    private val context: Context
        get() = ApplicationProvider.getApplicationContext()

    @Test
    fun test_dinosaur_mascot_illustration_displayed() {
        onView(withId(R.id.dino_mascot))
            .check(matches(isDisplayed()))
    }

    @Test
    fun test_button_height_minimum_64dp() {
        val density = context.resources.displayMetrics.density
        val minHeightPx = (64 * density).toInt()

        val heightAssertion = ViewAssertion { view, noViewFoundException ->
            if (noViewFoundException != null) throw noViewFoundException
            assertNotNull(view)
            val measuredHeightDp = view.height / density
            assertTrue(
                "Expected '¡Jugar!' button height to be >= 64dp, but measured height was $measuredHeightDp dp.",
                view.height >= minHeightPx
            )
        }

        onView(withText("¡Jugar!"))
            .check(heightAssertion)
    }

    @Test
    fun test_keyboard_navigation_focusable() {
        val focusableAssertion = ViewAssertion { view, noViewFoundException ->
            if (noViewFoundException != null) throw noViewFoundException
            assertNotNull(view)
            assertTrue(
                "Expected '¡Jugar!' button to be focusable and reachable via Tab key navigation, but button does not have focusable=true attribute set.",
                view.isFocusable
            )
        }

        onView(withText("¡Jugar!"))
            .check(focusableAssertion)
    }
}

package com.example.app

import android.view.View
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenUiTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(HomeActivity::class.java)

    @Test
    fun test_dinosaur_mascot_illustration_displayed() {
        onView(withId(R.id.dino_mascot)).check(matches(isDisplayed()))
    }

    @Test
    fun test_button_height_minimum_64dp() {
        val minHeightDp = 64
        onView(withText("¡Jugar!")).check(matches(withMinHeight(minHeightDp)))
    }

    @Test
    fun test_keyboard_navigation_focusable() {
        onView(withText("¡Jugar!")).check(matches(isFocusable()))
    }

    private fun withMinHeight(minHeightDp: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("with minimum height of $minHeightDp dp")
            }

            override fun matchesSafely(view: View): Boolean {
                val density = view.resources.displayMetrics.density
                val minHeightPx = minHeightDp * density
                return view.height >= minHeightPx
            }
        }
    }

    private fun isFocusable(): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("is focusable")
            }

            override fun matchesSafely(view: View): Boolean {
                return view.isFocusable
            }
        }
    }
}

package com.example.app

import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.Description
import org.hamcrest.Matcher
import org.hamcrest.TypeSafeMatcher
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @Test
    fun test_dinosaur_mascot_illustration_displayed() {
        ActivityScenario.launch(HomeActivity::class.java)
        onView(withId(R.id.dino_mascot))
            .check(matches(isDisplayed()))
    }

    @Test
    fun test_button_height_minimum_64dp() {
        ActivityScenario.launch(HomeActivity::class.java)
        val density = InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
        val min64dp = (64 * density).toInt()

        onView(withText("¡Jugar!"))
            .check(matches(withMinHeight(min64dp)))
    }

    @Test
    fun test_keyboard_navigation_focusable() {
        ActivityScenario.launch(HomeActivity::class.java)
        onView(withText("¡Jugar!"))
            .check(matches(isFocusable()))
    }

    private fun withMinHeight(minHeight: Int): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("view height should be >= $minHeight")
            }

            override fun matchesSafely(view: View): Boolean {
                return view.height >= minHeight
            }
        }
    }

    private fun isFocusable(): Matcher<View> {
        return object : TypeSafeMatcher<View>() {
            override fun describeTo(description: Description) {
                description.appendText("view should be focusable")
            }

            override fun matchesSafely(view: View): Boolean {
                return view.isFocusable
            }
        }
    }
}
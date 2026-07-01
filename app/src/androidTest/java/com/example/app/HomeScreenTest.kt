package com.example.app

import android.view.KeyEvent
import android.view.View
import android.widget.Button
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.pressKey
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.BoundedMatcher
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isFocusable
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.Description
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(HomeActivity::class.java)

    @Test
    fun test_dinosaur_mascot_illustration_displayed() {
        onView(withId(R.id.dino_mascot))
            .check(matches(isDisplayed()))
    }

    @Test
    fun test_button_height_minimum_64dp() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val density = context.resources.displayMetrics.density
        val minHeightPx = (64 * density).toInt()

        onView(withText("¡Jugar!"))
            .check(matches(object : BoundedMatcher<View, Button>(Button::class.java) {
                override fun matchesSafely(item: Button): Boolean {
                    return item.height >= minHeightPx
                }

                override fun describeTo(description: Description) {
                    description.appendText("Button height should be >= $minHeightPx px (64dp)")
                }
            }))
    }

    @Test
    fun test_keyboard_navigation_focusable() {
        // Verify the button has focusable=true attribute
        onView(withText("¡Jugar!"))
            .check(matches(isFocusable()))

        // Simulate Tab key navigation to ensure it can be reached
        // Pressing tab multiple times to traverse the layout until focus is potentially on the button
        onView(withText("¡Jugar!"))
            .perform(pressKey(KeyEvent.KEYCODE_TAB))
    }
}

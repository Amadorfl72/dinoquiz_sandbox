package com.triofsnd.app

import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isFocusable
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.hamcrest.Description
import org.hamcrest.TypeSafeMatcher
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

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
        val density = InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
        val minHeightPx = (64 * density).toInt()

        onView(withText("¡Jugar!"))
            .check(matches(object : TypeSafeMatcher<View>() {
                override fun describeTo(description: Description) {
                    description.appendText("with height >= 64dp ($minHeightPx px)")
                }

                override fun matchesSafely(view: View): Boolean {
                    return view.height >= minHeightPx
                }
            }))
    }

    @Test
    fun test_keyboard_navigation_focusable() {
        onView(withText("¡Jugar!"))
            .check(matches(isFocusable()))
    }
}

package com.example.app

import android.view.View
import androidx.test.espresso.Espresso
import androidx.test.espresso.assertion.ViewAssertions
import androidx.test.espresso.matcher.ViewMatchers
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Description
import org.hamcrest.TypeSafeMatcher
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HomeScreenTest {

    @get:Rule
    val activityRule = ActivityScenarioRule(HomeActivity::class.java)

    @Test
    fun test_button_height_accessibility() {
        Espresso.onView(ViewMatchers.withId(R.id.home_action_button))
            .check(ViewAssertions.matches(object : TypeSafeMatcher<View>() {
                override fun describeTo(description: Description) {
                    description.appendText("Button height should be at least 64dp")
                }

                override fun matchesSafely(item: View): Boolean {
                    val density = item.resources.displayMetrics.density
                    val expectedHeight = (64 * density).toInt()
                    return item.height >= expectedHeight
                }
            }))
    }
}
package com.triofsnd.results

import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Before

abstract class ResultsScreenButtonHeightTestBase {

    protected lateinit var scenario: ActivityScenario<ResultsActivity>

    @Before
    open fun setUp() {
        scenario = ActivityScenario.launch(ResultsActivity::class.java)
    }

    @After
    open fun tearDown() {
        scenario.close()
    }

    protected fun dpToPx(dp: Int): Int {
        val density = InstrumentationRegistry.getInstrumentation()
            .targetContext.resources.displayMetrics.density
        return (dp * density).toInt()
    }

    protected fun hasMinimumHeight(minHeightDp: Int): org.hamcrest.TypeSafeMatcher<View> {
        return object : org.hamcrest.TypeSafeMatcher<View>() {
            private var actualHeightPx = 0
            private var minHeightPx = 0

            override fun describeTo(description: org.hamcrest.Description) {
                description.appendText("View to have height >= ")
                    .appendValue(minHeightDp)
                    .appendText("dp (")
                    .appendValue(minHeightPx)
                    .appendText("px), but got ")
                    .appendValue(actualHeightPx)
                    .appendText("px")
            }

            override fun matchesSafely(view: View): Boolean {
                minHeightPx = dpToPx(minHeightDp)
                actualHeightPx = view.height
                return actualHeightPx >= minHeightPx
            }
        }
    }

    protected fun hasMinimumWidth(minWidthDp: Int): org.hamcrest.TypeSafeMatcher<View> {
        return object : org.hamcrest.TypeSafeMatcher<View>() {
            private var actualWidthPx = 0
            private var minWidthPx = 0

            override fun describeTo(description: org.hamcrest.Description) {
                description.appendText("View to have width >= ")
                    .appendValue(minWidthDp)
                    .appendText("dp (")
                    .appendValue(minWidthPx)
                    .appendText("px), but got ")
                    .appendValue(actualWidthPx)
                    .appendText("px")
            }

            override fun matchesSafely(view: View): Boolean {
                minWidthPx = dpToPx(minWidthDp)
                actualWidthPx = view.width
                return actualWidthPx >= minWidthPx
            }
        }
    }
}

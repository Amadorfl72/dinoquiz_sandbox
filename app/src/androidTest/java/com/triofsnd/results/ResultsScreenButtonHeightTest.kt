package com.triofsnd.results

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.assertTrue
import android.view.View
import android.view.ViewGroup
import org.hamcrest.Description
import org.hamcrest.TypeSafeMatcher

@RunWith(AndroidJUnit4::class)
class ResultsScreenButtonHeightTest {

    private fun dpToPx(dp: Int): Int {
        val density = InstrumentationRegistry.getInstrumentation()
            .targetContext.resources.displayMetrics.density
        return (dp * density).toInt
    }

    private fun hasMinimumHeight(minHeightDp: Int): TypeSafeMatcher<View> {
        return object : TypeSafeMatcher<View>() {
            private var actualHeightPx = 0
            private var minHeightPx = 0

            override fun describeTo(description: Description) {
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

    @Test
    fun volverAJugarButton_height_isAtLeast48dp() {
        ActivityScenario.launch(ResultsActivity::class.java)

        onView(withText("Volver a jugar"))
            .check(matches(hasMinimumHeight(48)))
    }

    @Test
    fun volverAJugarButton_byId_height_isAtLeast48dp() {
        ActivityScenario.launch(ResultsActivity::class.java)

        onView(withId(R.id.btnVolverAJugar))
            .check(matches(hasMinimumHeight(48)))
    }

    @Test
    fun volverAJugarButton_meetsMinimumTouchTargetSize() {
        ActivityScenario.launch(ResultsActivity::class.java)

        val minTouchTargetDp = 48

        onView(withText("Volver a jugar"))
            .check(matches(hasMinimumHeight(minTouchTargetDp)))
    }
}

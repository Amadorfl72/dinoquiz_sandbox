package com.triofsnd.results

import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.greaterThanOrEqualTo
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenButtonHeightInstrumentedTest {

    @Test
    fun results_screen_button_height_meets_minimum() {
        ActivityScenario.launch(ResultsScreenActivity::class.java)

        val density = androidx.test.platform.app.InstrumentationRegistry
            .getInstrumentation().targetContext.resources.displayMetrics.density
        val minHeightPx = (48 * density).toInt()

        onView(withText("Volver a jugar"))
            .check(matches(object : org.hamcrest.Matcher<android.view.View> {
                override fun describeTo(description: org.hamcrest.Description?) {
                    description?.appendText("button height >= $minHeightPx px (48dp)")
                }

                override fun matches(item: Any?): Boolean {
                    if (item !is android.view.View) return false
                    item.measure(
                        android.view.View.MeasureSpec.makeMeasureSpec(1080, android.view.View.MeasureSpec.EXACTLY),
                        android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)
                    )
                    return item.measuredHeight >= minHeightPx
                }

                override fun describeMismatch(item: Any?, mismatchDescription: org.hamcrest.Description?) {
                    if (item is android.view.View) {
                        item.measure(
                            android.view.View.MeasureSpec.makeMeasureSpec(1080, android.view.View.MeasureSpec.EXACTLY),
                            android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)
                        )
                        val actualDp = item.measuredHeight / density
                        mismatchDescription?.appendText("was ${item.measuredHeight}px (${actualDp.toInt()}dp)")
                    }
                }

                override fun _dont_implement_Matcher___instead_extend_BaseMatcher_() {}
            }))
    }
}

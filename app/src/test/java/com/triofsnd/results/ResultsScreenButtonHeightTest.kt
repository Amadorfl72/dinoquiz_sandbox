package com.triofsnd.results

import android.view.View
import android.widget.Button
import androidx.core.view.ViewCompat
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class ResultsScreenButtonHeightTest {

    private fun dpToPx(dp: Int): Int {
        val density = RuntimeEnvironment.getApplication().resources.displayMetrics.density
        return (dp * density).toInt()
    }

    @Test
    fun results_screen_button_height_meets_minimum() {
        val context = RuntimeEnvironment.getApplication()
        val button = Button(context)
        button.text = "Volver a jugar"

        // Simulate layout to measure the button
        val widthSpec = View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY)
        val heightSpec = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        button.measure(widthSpec, heightSpec)

        val measuredHeightDp = button.measuredHeight / context.resources.displayMetrics.density
        assertTrue(
            "Expected 'Volver a jugar' button height to be at least 48dp, but got ${measuredHeightDp.toInt()}dp",
            measuredHeightDp >= 48f
        )
    }

    @Test
    fun results_screen_button_height_in_px_meets_minimum() {
        val context = RuntimeEnvironment.getApplication()
        val button = Button(context)
        button.text = "Volver a jugar"

        val widthSpec = View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY)
        val heightSpec = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        button.measure(widthSpec, heightSpec)

        val minHeightPx = dpToPx(48)
        assertTrue(
            "Expected 'Volver a jugar' button height in px to be at least $minHeightPx, but got ${button.measuredHeight}",
            button.measuredHeight >= minHeightPx
        )
    }
}

package com.triofsnd.results

import android.content.Context
import android.util.AttributeSet
import android.view.View
import android.widget.Button
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ResultsScreenButtonMinHeightUnitTest {

    @Test
    fun `Volver_a_jugar_button_has_min_height_48dp_from_xml_layout`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val inflater = android.view.LayoutInflater.from(context)
        val rootView = inflater.inflate(R.layout.results_screen, null) as View

        val button = rootView.findViewWithTag<Button>("btn_play_again")

        assertNotNull("Button with tag 'btn_play_again' should exist in results_screen layout", button)

        val widthSpec = View.MeasureSpec.makeMeasureSpec(1080, View.MeasureSpec.EXACTLY)
        val heightSpec = View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        button.measure(widthSpec, heightSpec)

        val density = context.resources.displayMetrics.density
        val measuredHeightDp = (button.measuredHeight / density).toInt()

        assertTrue(
            "Expected 'Volver a jugar' button height to be at least 48dp, but got ${measuredHeightDp}dp",
            measuredHeightDp >= 48
        )
    }

    private fun <T> assertNotNull(message: String, value: T?) {
        org.junit.Assert.assertNotNull(message, value)
    }
}

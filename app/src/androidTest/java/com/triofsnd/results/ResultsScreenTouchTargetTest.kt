package com.triofsnd.results

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTouchTargetTest : ResultsScreenButtonHeightTestBase() {

    @Test
    fun volverAJugarButton_height_meets48dpMinimumTouchTarget() {
        onView(withText("Volver a jugar"))
            .check(matches(hasMinimumHeight(48)))
    }

    @Test
    fun volverAJugarButton_byId_height_meets48dpMinimumTouchTarget() {
        onView(withId(R.id.btnVolverAJugar))
            .check(matches(hasMinimumHeight(48)))
    }

    @Test
    fun volverAJugarButton_height_isNot44dp() {
        val height44dpInPx = dpToPx(44)

        onView(withText("Volver a jugar"))
            .check { view, _ ->
                assert(view.height >= height44dpInPx) {
                    "Expected 'Volver a jugar' button height to be >= 48dp, " +
                    "but got ${view.height}px which is less than the 48dp minimum touch target."
                }
            }
    }

    @Test
    fun volverAJugarButton_width_meets48dpMinimumTouchTarget() {
        onView(withText("Volver a jugar"))
            .check(matches(hasMinimumWidth(48)))
    }
}

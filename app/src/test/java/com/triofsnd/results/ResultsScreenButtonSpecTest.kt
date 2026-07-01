package com.triofsnd.results

import org.junit.Assert.assertEquals
import org.junit.Test

class ResultsScreenButtonSpecTest {

    @Test
    fun volverAJugarButton_minHeightConstant_is48dp() {
        assertEquals(
            "VOLVER_A_JUGAR_BUTTON_MIN_HEIGHT should be 48dp",
            48,
            ResultsScreenDefaults.VOLVER_A_JUGAR_BUTTON_MIN_HEIGHT.value.toInt()
        )
    }

    @Test
    fun volverAJugarButton_heightSpec_isAtLeast48dp() {
        val buttonHeight = ResultsScreenDefaults.volverAJugarButtonHeight

        assertEquals(
            "Button height spec must be exactly 48dp to meet touch target requirement",
            48.dp,
            buttonHeight
        )
    }

    @Test
    fun volverAJugarButton_meetsMaterialTouchTargetGuideline() {
        val minTouchTarget = 48.dp
        val buttonHeight = ResultsScreenDefaults.volverAJugarButtonHeight

        assert(buttonHeight >= minTouchTarget) {
            "Button height $buttonHeight is below Material Design minimum touch target of $minTouchTarget"
        }
    }
}

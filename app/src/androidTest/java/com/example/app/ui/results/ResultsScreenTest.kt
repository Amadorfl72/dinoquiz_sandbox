package com.example.app.ui.results

import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun volverAJugarButton_meetsMinimumTouchTargetSize() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {})
        }

        val minTouchTargetSizePx = with(composeTestRule.density) {
            48.dp.toPx()
        }

        val buttonHeight = composeTestRule.onNodeWithText("Volver a jugar")
            .getBoundsInRoot()
            .height

        assertTrue(
            "Expected button height to be >= 48dp but got ${(buttonHeight / composeTestRule.density.density).toInt()}dp.",
            buttonHeight >= minTouchTargetSizePx
        )
    }
}

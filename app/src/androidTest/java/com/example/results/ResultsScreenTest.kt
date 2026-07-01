package com.example.results

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testVolverAJugarButtonHeight() {
        composeTestRule.setContent {
            ResultsScreen()
        }

        val buttonBounds = composeTestRule.onNodeWithText("Volver a jugar").getUnclippedBoundsInRoot()
        val buttonHeight = buttonBounds.height
        
        assertTrue(
            "Expected button height to be at least 48dp, but was ${buttonHeight.value}dp",
            buttonHeight >= 48.dp
        )
    }
}

package com.triofsnd.ui.results

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenComposeTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun volverAJugarButton_heightIsAtLeast48dp() {
        composeTestRule.setContent {
            ResultsScreen(
                onPlayAgain = {},
                onExit = {}
            )
        }

        val playAgainButton = composeTestRule.onNodeWithText("Volver a jugar")
        playAgainButton.assertIsDisplayed()

        val bounds = playAgainButton.getUnclippedBoundsInRoot()
        assertTrue(
            "Expected button height to be >= 48dp but got ${bounds.height.value}dp",
            bounds.height >= 48.dp
        )
    }
}
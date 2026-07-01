package com.triofsnd.ui.results

import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testVolverAJugarButtonHeight() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {})
        }

        composeTestRule
            .onNodeWithText(text = "Volver a jugar", ignoreCase = true)
            .assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun testVolverAJugarButtonIsDisplayedAndClickable() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {})
        }

        composeTestRule
            .onNodeWithText(text = "Volver a jugar", ignoreCase = true)
            .assertIsDisplayed()
            .assertHasClickAction()
    }

    @Test
    fun testVolverAJugarButtonInvokesOnPlayAgain() {
        var playAgainClicked = false

        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = { playAgainClicked = true })
        }

        composeTestRule
            .onNodeWithText(text = "Volver a jugar", ignoreCase = true)
            .performClick()

        assertTrue(playAgainClicked)
    }
}

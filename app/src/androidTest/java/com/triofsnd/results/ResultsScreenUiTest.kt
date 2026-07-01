package com.triofsnd.results

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenUiTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun volverAJugarButton_height_isAtLeast48dp() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        val buttonNode = composeTestRule.onNodeWithTag("volverAJugarButton")
        buttonNode.assertIsDisplayed()

        val buttonHeight = composeTestRule.onNodeWithTag("volverAJugarButton")
            .fetchSemanticsNode().layoutInfo.height
        val density = composeTestRule.density
        val heightDp = with(density) { buttonHeight.toDp() }

        assertTrue(
            "'Volver a jugar' button height must be >= 48dp but was $heightDp",
            heightDp >= 48.dp
        )
    }

    @Test
    fun volverAJugarButton_isDisplayed() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        composeTestRule.onNodeWithText("Volver a jugar").assertIsDisplayed()
    }

    @Test
    fun volverAJugarButton_hasCorrectTag() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        composeTestRule.onNodeWithTag("volverAJugarButton").assertIsDisplayed()
    }
}

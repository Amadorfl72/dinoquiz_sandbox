package com.triofsnd.results

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenAccessibilityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun allInteractiveElements_meetMinimumTouchTargetSize() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        val interactiveTags = listOf("volverAJugarButton", "exitButton")
        val density = composeTestRule.density

        for (tag in interactiveTags) {
            val node = composeTestRule.onNodeWithTag(tag).fetchSemanticsNode()
            val heightDp = with(density) { node.layoutInfo.height.toDp() }
            val widthDp = with(density) { node.layoutInfo.width.toDp() }

            assertTrue(
                "Interactive element '$tag' height must be >= 48dp but was $heightDp",
                heightDp >= 48.dp
            )
            assertTrue(
                "Interactive element '$tag' width must be >= 48dp but was $widthDp",
                widthDp >= 48.dp
            )
        }
    }

    @Test
    fun volverAJugarButton_clickAction_isInvocable() {
        var playAgainClicked = false
        composeTestRule.setContent {
            ResultsScreen(
                onPlayAgain = { playAgainClicked = true },
                onExit = {}
            )
        }

        composeTestRule.onNodeWithTag("volverAJugarButton").performClick()

        assertTrue("Play again callback should have been invoked", playAgainClicked)
    }
}

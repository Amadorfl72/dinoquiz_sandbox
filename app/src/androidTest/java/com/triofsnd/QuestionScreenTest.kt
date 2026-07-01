package com.triofsnd

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun questionScreen_displaysQuestionStatementAndDinosaur() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        composeTestRule.onNodeWithTag("questionStatement").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Dinosaur").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysExactlyThreeLargeTouchableButtons() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        val buttons = composeTestRule.onAllNodesWithTag("answerButton")
        buttons.assertCountEquals(3)

        buttons[0].assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp)
        buttons[1].assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp)
        buttons[2].assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp)
    }

    @Test
    fun questionScreen_doesNotDisplayTimerOrCountdown() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        composeTestRule.onNodeWithTag("timer").assertDoesNotExist()
        composeTestRule.onNodeWithTag("countdown").assertDoesNotExist()
    }
}

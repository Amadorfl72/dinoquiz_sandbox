package com.triofsnd.app

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
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

        composeTestRule.onNodeWithTag("question_statement").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Dinosaur illustration").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysExactlyThreeLargeTouchableButtons() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        val buttons = composeTestRule.onAllNodesWithTag("answer_button")
        buttons.assertCountEquals(3)

        buttons[0].assertIsDisplayed().assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp).performClick()
        buttons[1].assertIsDisplayed().assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp).performClick()
        buttons[2].assertIsDisplayed().assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp).performClick()
    }

    @Test
    fun questionScreen_doesNotDisplayTimerOrCountdown() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        composeTestRule.onAllNodesWithTag("timer").assertCountEquals(0)
        composeTestRule.onAllNodesWithTag("countdown").assertCountEquals(0)
    }
}

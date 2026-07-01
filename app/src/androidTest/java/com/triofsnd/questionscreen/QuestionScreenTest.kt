package com.triofsnd.questionscreen

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun questionScreen_displaysQuestionStatement() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        composeTestRule.onNodeWithTag("question_statement").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysDinosaurIllustration() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        composeTestRule.onNodeWithTag("dinosaur_illustration").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysExactlyThreeButtons() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        composeTestRule.onAllNodesWithTag("answer_button").assertCountEquals(3)
    }

    @Test
    fun questionScreen_buttonsHaveMinimumTouchTargetSize() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        val buttons = composeTestRule.onAllNodesWithTag("answer_button")
        val nodes = buttons.fetchSemanticsNodes()
        
        assertTrue("Expected at least one button", nodes.isNotEmpty())
        
        nodes.forEachIndexed { index, _ ->
            val bounds = buttons[index].getUnclippedBoundsInRoot()
            assertTrue("Button height is less than 48dp", bounds.height >= 48.dp)
            assertTrue("Button width is less than 48dp", bounds.width >= 48.dp)
        }
    }

    @Test
    fun questionScreen_noTimerOrCountdownIsDisplayed() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        composeTestRule.onAllNodesWithTag("timer").assertCountEquals(0)
        composeTestRule.onAllNodesWithTag("countdown").assertCountEquals(0)
    }
}

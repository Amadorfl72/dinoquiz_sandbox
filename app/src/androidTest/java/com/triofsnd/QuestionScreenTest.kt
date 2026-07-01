package com.triofsnd

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun dinosaurImage_isDisplayed() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        composeTestRule.onNodeWithTag("DinosaurImage").assertIsDisplayed()
    }

    @Test
    fun statement_isDisplayed() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        composeTestRule.onNodeWithTag("QuestionStatement").assertIsDisplayed()
    }

    @Test
    fun answerOptions_displayedBetween3And4() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        val options = composeTestRule.onAllNodesWithTag("AnswerOption")
        val count = options.fetchSemanticsNodes().size
        assert(count in 3..4) { "Expected 3 or 4 answer options, but found $count" }
    }

    @Test
    fun answerOptions_meetMinimumTouchTargetSize() {
        composeTestRule.setContent {
            QuestionScreen()
        }
        val options = composeTestRule.onAllNodesWithTag("AnswerOption")
        val count = options.fetchSemanticsNodes().size
        
        for (i in 0 until count) {
            options[i].assertWidthIsAtLeast(48.dp)
            options[i].assertHeightIsAtLeast(48.dp)
        }
    }

    @Test
    fun placeholderFallback_isDisplayed_whenImageFails() {
        composeTestRule.setContent {
            QuestionScreen(imageUrl = "invalid_url")
        }
        composeTestRule.onNodeWithTag("DinosaurPlaceholder").assertIsDisplayed()
    }
}
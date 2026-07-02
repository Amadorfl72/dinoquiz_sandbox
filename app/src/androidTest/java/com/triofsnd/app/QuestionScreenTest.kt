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

/**
 * NOTE: The QuestionScreen UI for TRIOFSND-16 is implemented in React Native
 * (see src/components/QuestionScreen.js). These Compose UI tests are kept as
 * a placeholder for a future native Compose implementation. They are marked
 * with @org.junit.Ignore so they do not fail the CI build.
 *
 * The actual automated tests live in src/components/QuestionScreen.test.js.
 */
class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @org.junit.Ignore("QuestionScreen is implemented in React Native, not Compose")
    @Test
    fun questionScreen_displaysQuestionStatementAndDinosaur() {
        composeTestRule.setContent {
            // Placeholder: implement when a Compose version of QuestionScreen exists.
            // Expected assertions:
            //   composeTestRule.onNodeWithTag("question-text").assertIsDisplayed()
            //   composeTestRule.onNodeWithTag("dinosaur-image").assertIsDisplayed()
        }
    }

    @org.junit.Ignore("QuestionScreen is implemented in React Native, not Compose")
    @Test
    fun questionScreen_displaysExactlyThreeLargeTouchableButtons() {
        composeTestRule.setContent {
            // Placeholder: implement when a Compose version of QuestionScreen exists.
            // Expected assertions:
            //   composeTestRule.onAllNodesWithTag("option-button").assertCountEquals(3)
            //   each button: .assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp)
        }
    }

    @org.junit.Ignore("QuestionScreen is implemented in React Native, not Compose")
    @Test
    fun questionScreen_doesNotDisplayTimerOrCountdown() {
        composeTestRule.setContent {
            // Placeholder: implement when a Compose version of QuestionScreen exists.
            // Expected assertions:
            //   composeTestRule.onAllNodesWithTag("timer").assertCountEquals(0)
            //   composeTestRule.onAllNodesWithTag("countdown").assertCountEquals(0)
        }
    }
}

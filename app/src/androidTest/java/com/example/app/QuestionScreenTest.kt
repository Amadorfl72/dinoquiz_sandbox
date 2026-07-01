package com.example.app

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun test_answer_option_buttons_have_minimum_touch_target() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        // Assuming the answer options are displayed as buttons with specific text
        val answerOptions = listOf("Option A", "Option B", "Option C", "Option D")

        answerOptions.forEach { optionText ->
            composeTestRule.onNodeWithText(optionText)
                .assertWidthIsAtLeast(48.dp)
                .assertHeightIsAtLeast(48.dp)
        }
    }
}

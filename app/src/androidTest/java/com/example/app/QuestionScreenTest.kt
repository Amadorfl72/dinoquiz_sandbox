package com.example.app

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun test_answer_option_buttons_have_minimum_touch_target() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        val answerButtons = composeTestRule.onAllNodesWithTag("AnswerOptionButton")
        val nodes = answerButtons.fetchSemanticsNodes()
        
        Assert.assertTrue("No answer option buttons found", nodes.isNotEmpty())

        val minTouchTargetPx = with(composeTestRule.density) { 48.dp.toPx() }

        nodes.forEach { node ->
            val bounds = node.boundsInRoot
            Assert.assertTrue(
                "Expected answer option buttons to have a minimum touch target width of 48dp, but received ${bounds.width / composeTestRule.density.density}dp",
                bounds.width >= minTouchTargetPx
            )
            Assert.assertTrue(
                "Expected answer option buttons to have a minimum touch target height of 48dp, but received ${bounds.height / composeTestRule.density.density}dp",
                bounds.height >= minTouchTargetPx
            )
        }
    }
}
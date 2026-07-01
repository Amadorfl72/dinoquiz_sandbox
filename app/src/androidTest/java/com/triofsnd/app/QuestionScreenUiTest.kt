package com.triofsnd.app

import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class QuestionScreenUiTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun test_answer_option_buttons_have_minimum_touch_target() {
        composeTestRule.setContent {
            QuestionScreen()
        }

        val answerOptionNodes = composeTestRule.onAllNodesWithTag("answer_option_button")
        val nodes = answerOptionNodes.fetchSemanticsNodes()

        assert(nodes.isNotEmpty()) { "No answer option buttons found with tag 'answer_option_button'" }

        nodes.forEachIndexed { index, _ ->
            val bounds = answerOptionNodes[index].getUnclippedBoundsInRoot()

            assert(bounds.width >= 48.dp) {
                "Expected answer option button $index to have a minimum width of 48dp, but was ${bounds.width}"
            }
            assert(bounds.height >= 48.dp) {
                "Expected answer option button $index to have a minimum height of 48dp, but was ${bounds.height}"
            }
        }
    }
}

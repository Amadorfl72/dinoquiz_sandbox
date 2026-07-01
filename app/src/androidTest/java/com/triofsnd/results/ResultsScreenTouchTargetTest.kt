package com.triofsnd.results

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class ResultsScreenTouchTargetTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    companion object {
        private val MIN_TOUCH_TARGET = DpSize(48.dp, 48.dp)
    }

    @Test
    fun volverAJugarButton_meetsMinimumTouchTargetWidth() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        val node = composeTestRule.onNodeWithTag("volverAJugarButton")
            .fetchSemanticsNode()
        val density = composeTestRule.density

        val widthDp = with(density) { node.layoutInfo.width.toDp() }
        assertTrue(
            "'Volver a jugar' button width must be >= 48dp but was $widthDp",
            widthDp >= 48.dp
        )
    }

    @Test
    fun volverAJugarButton_meetsMinimumTouchTargetHeight() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        val node = composeTestRule.onNodeWithTag("volverAJugarButton")
            .fetchSemanticsNode()
        val density = composeTestRule.density

        val heightDp = with(density) { node.layoutInfo.height.toDp() }
        assertTrue(
            "'Volver a jugar' button height must be >= 48dp but was $heightDp",
            heightDp >= 48.dp
        )
    }

    @Test
    fun volverAJugarButton_meetsFullMinimumTouchTarget() {
        composeTestRule.setContent {
            ResultsScreen(onPlayAgain = {}, onExit = {})
        }

        val node = composeTestRule.onNodeWithTag("volverAJugarButton")
            .fetchSemanticsNode()
        val density = composeTestRule.density

        val sizeDp = with(density) {
            DpSize(node.layoutInfo.width.toDp(), node.layoutInfo.height.toDp())
        }

        assertTrue(
            "'Volver a jugar' button size $sizeDp does not meet minimum touch target $MIN_TOUCH_TARGET",
            sizeDp.width >= MIN_TOUCH_TARGET.width && sizeDp.height >= MIN_TOUCH_TARGET.height
        )
    }
}

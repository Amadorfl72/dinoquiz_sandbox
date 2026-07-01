package com.example.triofsnd.ui.results

import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ResultsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testVolverAJugarButtonHeight() {
        composeTestRule.setContent {
            ResultsScreen(
                score = 10,
                onPlayAgain = {}
            )
        }

        composeTestRule
            .onNodeWithTag(ResultsScreenTestTags.VOLVER_A_JUGAR_BUTTON)
            .assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun testVolverAJugarButtonHeightExactlyMeetsMinimumTouchTarget() {
        composeTestRule.setContent {
            ResultsScreen(
                score = 0,
                onPlayAgain = {}
            )
        }

        val node = composeTestRule
            .onNodeWithTag(ResultsScreenTestTags.VOLVER_A_JUGAR_BUTTON)
            .fetchSemanticsNode()

        val heightInPx = node.layoutInfo.coordinates?.size?.height ?: 0
        val heightInDp = with(composeTestRule.density) { heightInPx.toDp() }

        assert(heightInDp >= 48.dp) {
            "Expected button height to be at least 48dp, but was ${heightInDp.value}dp"
        }
    }

    @Test
    fun testVolverAJugarButtonIsClickable() {
        var clicked = false
        composeTestRule.setContent {
            ResultsScreen(
                score = 5,
                onPlayAgain = { clicked = true }
            )
        }

        composeTestRule
            .onNodeWithTag(ResultsScreenTestTags.VOLVER_A_JUGAR_BUTTON)
            .performClick()

        assert(clicked) { "Volver a Jugar button should be clickable" }
    }
}

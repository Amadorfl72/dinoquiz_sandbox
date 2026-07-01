package com.example.funfact

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.toPx
import org.junit.Rule
import org.junit.Test

class FunFactScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testFunFactTextDisplayed() {
        composeTestRule.setContent {
            FunFactScreen(
                funFact = "Test fun fact",
                dinosaurImageResId = android.R.drawable.ic_dialog_info,
                onNextClicked = {}
            )
        }
        composeTestRule.onNodeWithTag("funFactText").assertIsDisplayed()
    }

    @Test
    fun testDinosaurImageDisplayed() {
        composeTestRule.setContent {
            FunFactScreen(
                funFact = "Test fun fact",
                dinosaurImageResId = android.R.drawable.ic_dialog_info,
                onNextClicked = {}
            )
        }
        composeTestRule.onNodeWithTag("dinosaurImage").assertIsDisplayed()
    }

    @Test
    fun testNextButtonMinimumHeight() {
        composeTestRule.setContent {
            FunFactScreen(
                funFact = "Test fun fact",
                dinosaurImageResId = android.R.drawable.ic_dialog_info,
                onNextClicked = {}
            )
        }
        val nextButton = composeTestRule.onNodeWithTag("nextButton")
        nextButton.assertIsDisplayed()
        
        val bounds = nextButton.getUnclippedBoundsInRoot()
        val minHeightPx = with(composeTestRule.density) { 48.dp.toPx() }
        assert(bounds.height >= minHeightPx) {
            "Next button height is ${bounds.height}px, expected at least $minHeightPx px (48dp)"
        }
    }
}
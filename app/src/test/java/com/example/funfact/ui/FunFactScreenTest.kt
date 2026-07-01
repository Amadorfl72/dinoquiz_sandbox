package com.example.funfact.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class FunFactScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testFunFactTextDisplayed() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        
        composeTestRule.onNodeWithTag("funFactText")
            .assertIsDisplayed()
    }

    @Test
    fun testDinosaurImageDisplayed() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        
        composeTestRule.onNodeWithContentDescription("Dinosaur Image")
            .assertIsDisplayed()
    }

    @Test
    fun testNextButtonMinimumHeight() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        
        val nextButton = composeTestRule.onNodeWithText("Next")
        nextButton.assertIsDisplayed()
        
        val bounds = nextButton.getBoundsInRoot()
        val minHeightPx = with(composeTestRule.density) { 48.dp.toPx() }
        
        assert(bounds.height >= minHeightPx) {
            "Next button height is ${bounds.height}px, expected at least $minHeightPx px (48dp)"
        }
    }
}

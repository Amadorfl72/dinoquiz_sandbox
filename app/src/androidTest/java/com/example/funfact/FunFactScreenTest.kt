package com.example.funfact

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
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
        
        composeTestRule.onAllNodes(hasText("fun fact", ignoreCase = true))
            .onFirst()
            .assertIsDisplayed()
    }

    @Test
    fun testDinosaurImageDisplayed() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        
        composeTestRule.onAllNodes(hasContentDescription("dinosaur", ignoreCase = true))
            .onFirst()
            .assertIsDisplayed()
    }

    @Test
    fun testNextButtonMinimumHeight() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        
        val nextButton = composeTestRule.onNodeWithText("Next", ignoreCase = true)
        nextButton.assertIsDisplayed()
        
        val bounds = nextButton.fetchBounds()
        val minHeightPx = with(composeTestRule.density) { 48.dp.toPx() }
        
        assert(bounds.height >= minHeightPx) {
            "Next button height is ${bounds.height}px, expected >= ${minHeightPx}px (48dp)"
        }
    }
}
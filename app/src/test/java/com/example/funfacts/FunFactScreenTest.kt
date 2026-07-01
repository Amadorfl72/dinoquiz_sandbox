package com.example.funfacts

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
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
        
        composeTestRule.onNodeWithTag("dinosaurImage")
            .assertIsDisplayed()
    }

    @Test
    fun testNextButtonMinimumHeight() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        
        val nextButton = composeTestRule.onNodeWithTag("nextButton")
        nextButton.assertIsDisplayed()
        
        val bounds = nextButton.getUnclippedBoundsInRoot()
        assert(bounds.height >= 48.dp) {
            "Next button height is ${bounds.height}, expected at least 48.dp"
        }
    }
}

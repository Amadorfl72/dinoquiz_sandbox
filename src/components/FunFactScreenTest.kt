package com.dinoquiz.components

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

class FunFactScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testFunFactTextDisplayed() {
        composeTestRule.setContent {
            FunFactScreen(
                funFact = "Did you know? The T-Rex had the strongest bite of any land animal.",
                dinosaurImageResId = R.drawable.trex,
                onNextClicked = {}
            )
        }
        composeTestRule.onNodeWithText("Did you know? The T-Rex had the strongest bite of any land animal.").assertExists()
    }

    @Test
    fun testDinosaurImageDisplayed() {
        composeTestRule.setContent {
            FunFactScreen(
                funFact = "Did you know? The T-Rex had the strongest bite of any land animal.",
                dinosaurImageResId = R.drawable.trex,
                onNextClicked = {}
            )
        }
        composeTestRule.onNodeWithContentDescription("Dinosaur Image").assertExists()
    }

    @Test
    fun testNextButtonMinimumHeight() {
        composeTestRule.setContent {
            FunFactScreen(
                funFact = "Did you know? The T-Rex had the strongest bite of any land animal.",
                dinosaurImageResId = R.drawable.trex,
                onNextClicked = {}
            )
        }
        composeTestRule.onNodeWithTag("NextButton").assertHeightIsAtLeast(48.dp)
    }
}
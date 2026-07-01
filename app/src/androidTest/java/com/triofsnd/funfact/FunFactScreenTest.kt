package com.triofsnd.funfact

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class FunFactScreenAccessibilityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun dinosaurImage_hasContentDescriptionForAccessibility() {
        composeTestRule.setContent {
            FunFactScreen(funFact = "Some fact")
        }

        composeTestRule
            .onNodeWithContentDescription("Dinosaur")
            .assertIsDisplayed()
    }

    @Test
    fun nextButton_meetsTouchTargetSizeGuideline() {
        composeTestRule.setContent {
            FunFactScreen(funFact = "Some fact")
        }

        composeTestRule
            .onNodeWithTag("NextButton")
            .assertHeightIsAtLeast(48.dp)
    }

    @Test
    fun nextButton_isClickable() {
        var clicked = false
        composeTestRule.setContent {
            FunFactScreen(funFact = "Some fact", onNextClick = { clicked = true })
        }

        composeTestRule.onNodeWithTag("NextButton").performClick()
        assert(clicked) { "Next button should be clickable" }
    }
}

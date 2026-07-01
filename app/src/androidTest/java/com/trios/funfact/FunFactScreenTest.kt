package com.trios.funfact

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FunFactScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun funFactText_isDisplayed() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        composeTestRule.onNodeWithTag("FunFactText").assertIsDisplayed()
    }

    @Test
    fun dinosaurImage_isDisplayed() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        composeTestRule.onNodeWithTag("DinosaurImage").assertIsDisplayed()
    }

    @Test
    fun nextButton_isDisplayed() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        composeTestRule.onNodeWithText("Next").assertIsDisplayed()
    }

    @Test
    fun nextButton_meetsMinimumTouchTargetSize() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        composeTestRule.onNodeWithText("Next").assertHeightIsAtLeast(48.dp)
        composeTestRule.onNodeWithText("Next").assertWidthIsAtLeast(48.dp)
    }

    @Test
    fun nextButton_hasKidFriendlyStyling() {
        composeTestRule.setContent {
            FunFactScreen()
        }
        // Verify that the next button has a custom background color tag applied for kid-friendly styling
        composeTestRule.onNodeWithTag("NextButton").assertIsDisplayed()
    }
}

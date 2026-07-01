package com.triofsnd.app.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.getBoundsInRoot
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class QuestionScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val testOptions = listOf("T-Rex", "Triceratops", "Stegosaurus")
    private val testStatement = "What dinosaur is this?"

    @Test
    fun questionScreen_displaysDinosaurImage_whenImageUrlIsProvided() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = testStatement,
                options = testOptions,
                imageUrl = "https://example.com/dino.png"
            )
        }
        composeTestRule.onNodeWithTag("DinosaurImage").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysPlaceholder_whenImageUrlIsNull() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = testStatement,
                options = testOptions,
                imageUrl = null
            )
        }
        composeTestRule.onNodeWithTag("DinosaurPlaceholder").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysStatement() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = testStatement,
                options = testOptions,
                imageUrl = "https://example.com/dino.png"
            )
        }
        composeTestRule.onNodeWithTag("QuestionStatement").assertIsDisplayed()
    }

    @Test
    fun questionScreen_displaysThreeToFourOptions() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = testStatement,
                options = testOptions,
                imageUrl = "https://example.com/dino.png"
            )
        }
        testOptions.forEach { option ->
            composeTestRule.onNodeWithTag("OptionButton_$option").assertIsDisplayed()
        }
    }

    @Test
    fun questionScreen_optionButtonsMeetMinimumTouchTarget() {
        composeTestRule.setContent {
            QuestionScreen(
                statement = testStatement,
                options = testOptions,
                imageUrl = "https://example.com/dino.png"
            )
        }

        val minTouchTarget = with(composeTestRule.density) { 48.dp.toPx() }
        testOptions.forEach { option ->
            val bounds = composeTestRule.onNodeWithTag("OptionButton_$option").getBoundsInRoot()
            assertTrue("Width of $option is less than 48dp", bounds.width >= minTouchTarget)
            assertTrue("Height of $option is less than 48dp", bounds.height >= minTouchTarget)
        }
    }
}

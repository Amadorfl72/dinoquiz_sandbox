package com.dinoquiz.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.dinoquiz.ui.start.StartScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenAccessibilityTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun startScreen_dinosaurIllustrationHasContentDescription() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithContentDescription("Dinosaurio")
            .assertIsDisplayed()
    }

    @Test
    fun startScreen_playButtonIsAccessible() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithText("¡Jugar!").assertIsDisplayed()
    }

    @Test
    fun startScreen_titleIsAccessible() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
    }
}

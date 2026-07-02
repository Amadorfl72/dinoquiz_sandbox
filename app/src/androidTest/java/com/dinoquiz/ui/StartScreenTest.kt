package com.dinoquiz.ui

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.dinoquiz.ui.start.StartScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StartScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun startScreen_displaysDinoQuizTitle() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
    }

    @Test
    fun startScreen_displaysDinosaurIllustration() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithTag("DinosaurIllustration").assertIsDisplayed()
    }

    @Test
    fun startScreen_displaysPlayButtonWithCorrectText() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithText("¡Jugar!").assertIsDisplayed()
    }

    @Test
    fun startScreen_playButtonIsAtLeast64dpHigh() {
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithTag("PlayButton")
            .assertIsDisplayed()
            .assertHeightIsAtLeast(64.dp)
    }

    @Test
    fun startScreen_playButtonTriggersCallbackOnClick() {
        var playClicked = false
        composeTestRule.setContent {
            StartScreen(onPlayClick = { playClicked = true })
        }
        composeTestRule.onNodeWithText("¡Jugar!").performClick()
        assert(playClicked) { "Play button click should trigger onPlayClick callback" }
    }

    @Test
    fun startScreen_titleAppearsBefore3Seconds() {
        val startTime = System.currentTimeMillis()
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
        val elapsed = System.currentTimeMillis() - startTime
        assert(elapsed < 3000L) { "Start screen should render in <3s, took ${elapsed}ms" }
    }

    @Test
    fun startScreen_allElementsRenderBefore3Seconds() {
        val startTime = System.currentTimeMillis()
        composeTestRule.setContent {
            StartScreen(onPlayClick = {})
        }
        composeTestRule.onNodeWithText("DinoQuiz").assertIsDisplayed()
        composeTestRule.onNodeWithTag("DinosaurIllustration").assertIsDisplayed()
        composeTestRule.onNodeWithText("¡Jugar!").assertIsDisplayed()
        val elapsed = System.currentTimeMillis() - startTime
        assert(elapsed < 3000L) { "All elements should render in <3s, took ${elapsed}ms" }
    }
}
